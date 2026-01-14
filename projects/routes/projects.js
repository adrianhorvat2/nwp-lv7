var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var createError = require('http-errors');
var auth = require('../middleware/auth');

const DATA_FILE = path.join(__dirname, '../data/projects.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Helper function to read projects
function readProjects() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper function to write projects
function writeProjects(projects) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

// Helper function to read users
function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper function to get users by IDs
function getUsersByIds(userIds) {
  const users = readUsers();
  return userIds.map(id => users.find(u => u.id === id)).filter(u => u);
}

// Helper function to check if user is project leader
function isProjectLeader(project, userId) {
  return project.leaderId === userId;
}

// Helper function to check if user is project member
function isProjectMember(project, userId) {
  return project.teamMembers && project.teamMembers.includes(userId);
}

// GET - Lista svih projekata (non-archived)
router.get('/', auth.requireAuth, function (req, res, next) {
  const projects = readProjects().filter(p => !p.archived);
  res.render('projects/index', { title: 'Projekti', projects: projects });
});

// GET - My projects (where user is leader)
router.get('/my-projects', auth.requireAuth, function (req, res, next) {
  const projects = readProjects().filter(p => p.leaderId === req.user.id && !p.archived);
  res.render('projects/my-projects', { title: 'Moji projekti', projects: projects });
});

// GET - My memberships (where user is member)
router.get('/my-memberships', auth.requireAuth, function (req, res, next) {
  const projects = readProjects().filter(p =>
    isProjectMember(p, req.user.id) && !p.archived
  );
  res.render('projects/my-memberships', { title: 'Projekti gdje sam član', projects: projects });
});

// GET - Archive (all archived projects where user is leader or member)
router.get('/archive', auth.requireAuth, function (req, res, next) {
  const projects = readProjects().filter(p =>
    p.archived && (p.leaderId === req.user.id || isProjectMember(p, req.user.id))
  );
  res.render('projects/archive', { title: 'Arhiva projekata', projects: projects });
});

// GET - Forma za novi projekt
router.get('/new', auth.requireAuth, function (req, res, next) {
  const users = readUsers().filter(u => u.id !== req.user.id);
  res.render('projects/form', {
    title: 'Novi projekt',
    project: null,
    action: '/projects',
    users: users
  });
});

// POST - Kreiranje novog projekta
router.post('/', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();

  // Parse team members from form (array of user IDs)
  let teamMembers = [];
  if (req.body.teamMembers) {
    teamMembers = Array.isArray(req.body.teamMembers)
      ? req.body.teamMembers
      : [req.body.teamMembers];
  }

  const newProject = {
    id: Date.now().toString(),
    naziv: req.body.naziv,
    opis: req.body.opis,
    cijena: parseFloat(req.body.cijena) || 0,
    obavljeniPoslovi: req.body.obavljeniPoslovi || '',
    datumPocetka: req.body.datumPocetka,
    datumZavrsetka: req.body.datumZavrsetka,
    leaderId: req.user.id,
    teamMembers: teamMembers,
    archived: false
  };

  projects.push(newProject);
  writeProjects(projects);
  res.redirect('/projects');
});

// GET - Detalji projekta
router.get('/:id', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);

  if (!project) {
    return next(createError(404));
  }

  // Check if user has access to this project
  if (project.leaderId !== req.user.id && !isProjectMember(project, req.user.id)) {
    return next(createError(403, 'Nemate pristup ovom projektu'));
  }

  // Load leader and team member details
  const users = readUsers();
  const leader = users.find(u => u.id === project.leaderId);
  const teamMembers = getUsersByIds(project.teamMembers || []);

  const isLeader = isProjectLeader(project, req.user.id);
  const isMember = isProjectMember(project, req.user.id);

  res.render('projects/details', {
    title: 'Detalji projekta',
    project: project,
    leader: leader,
    teamMembers: teamMembers,
    isLeader: isLeader,
    isMember: isMember
  });
});

// GET - Forma za uređivanje projekta
router.get('/:id/edit', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);

  if (!project) {
    return next(createError(404));
  }

  // Only leader can edit
  if (!isProjectLeader(project, req.user.id)) {
    return next(createError(403, 'Samo voditelj projekta može uređivati projekt'));
  }

  const users = readUsers().filter(u => u.id !== req.user.id);

  res.render('projects/form', {
    title: 'Uredi projekt',
    project: project,
    action: '/projects/' + project.id,
    users: users
  });
});

// POST - Ažuriranje projekta (leader only)
router.post('/:id', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return next(createError(404));
  }

  // Only leader can update
  if (!isProjectLeader(projects[index], req.user.id)) {
    return next(createError(403, 'Samo voditelj projekta može ažurirati projekt'));
  }

  let teamMembers = [];
  if (req.body.teamMembers) {
    teamMembers = Array.isArray(req.body.teamMembers)
      ? req.body.teamMembers
      : [req.body.teamMembers];
  }

  projects[index] = {
    ...projects[index],
    naziv: req.body.naziv,
    opis: req.body.opis,
    cijena: parseFloat(req.body.cijena) || 0,
    obavljeniPoslovi: req.body.obavljeniPoslovi || '',
    datumPocetka: req.body.datumPocetka,
    datumZavrsetka: req.body.datumZavrsetka,
    teamMembers: teamMembers
  };

  writeProjects(projects);
  res.redirect('/projects/' + req.params.id);
});

// POST - Update completed work (member only)
router.post('/:id/update-work', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return next(createError(404));
  }

  // Only members (not leaders) can use this endpoint
  if (!isProjectMember(projects[index], req.user.id)) {
    return next(createError(403, 'Možete ažurirati samo projekte gdje ste član'));
  }

  projects[index].obavljeniPoslovi = req.body.obavljeniPoslovi || '';
  writeProjects(projects);
  res.redirect('/projects/' + req.params.id);
});

// POST - Toggle archive status (leader only)
router.post('/:id/archive', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return next(createError(404));
  }

  // Only leader can archive
  if (!isProjectLeader(projects[index], req.user.id)) {
    return next(createError(403, 'Samo voditelj projekta može arhivirati projekt'));
  }

  projects[index].archived = !projects[index].archived;
  writeProjects(projects);

  res.redirect('/projects/' + req.params.id);
});

// POST - Brisanje projekta (leader only)
router.post('/:id/delete', auth.requireAuth, function (req, res, next) {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);

  if (!project) {
    return next(createError(404));
  }

  // Only leader can delete
  if (!isProjectLeader(project, req.user.id)) {
    return next(createError(403, 'Samo voditelj projekta može obrisati projekt'));
  }

  const filteredProjects = projects.filter(p => p.id !== req.params.id);
  writeProjects(filteredProjects);
  res.redirect('/projects');
});

module.exports = router;


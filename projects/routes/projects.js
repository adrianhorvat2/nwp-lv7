var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');

const DATA_FILE = path.join(__dirname, '../data/projects.json');

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

// GET - Lista svih projekata
router.get('/', function(req, res, next) {
  const projects = readProjects();
  res.render('projects/index', { title: 'Projekti', projects: projects });
});

// GET - Forma za novi projekt
router.get('/new', function(req, res, next) {
  res.render('projects/form', { 
    title: 'Novi projekt', 
    project: null,
    action: '/projects'
  });
});

// POST - Kreiranje novog projekta
router.post('/', function(req, res, next) {
  const projects = readProjects();
  
  // Parse team members from form
  let teamMembers = [];
  if (req.body.teamMembers) {
    teamMembers = req.body.teamMembers
      .split('\n')
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }
  
  const newProject = {
    id: Date.now().toString(),
    naziv: req.body.naziv,
    opis: req.body.opis,
    cijena: parseFloat(req.body.cijena) || 0,
    obavljeniPoslovi: req.body.obavljeniPoslovi || '',
    datumPocetka: req.body.datumPocetka,
    datumZavrsetka: req.body.datumZavrsetka,
    teamMembers: teamMembers
  };
  
  projects.push(newProject);
  writeProjects(projects);
  res.redirect('/projects');
});

// GET - Detalji projekta
router.get('/:id', function(req, res, next) {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);
  
  if (!project) {
    return next(createError(404));
  }
  
  res.render('projects/details', { title: 'Detalji projekta', project: project });
});

// GET - Forma za uređivanje projekta
router.get('/:id/edit', function(req, res, next) {
  const projects = readProjects();
  const project = projects.find(p => p.id === req.params.id);
  
  if (!project) {
    return next(createError(404));
  }
  
  res.render('projects/form', { 
    title: 'Uredi projekt', 
    project: project,
    action: '/projects/' + project.id
  });
});

// POST - Ažuriranje projekta
router.post('/:id', function(req, res, next) {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return next(createError(404));
  }
  
  let teamMembers = [];
  if (req.body.teamMembers) {
    teamMembers = req.body.teamMembers
      .split('\n')
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }
  
  projects[index] = {
    id: req.params.id,
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

// POST - Brisanje projekta
router.post('/:id/delete', function(req, res, next) {
  const projects = readProjects();
  const filteredProjects = projects.filter(p => p.id !== req.params.id);
  
  writeProjects(filteredProjects);
  res.redirect('/projects');
});

module.exports = router;

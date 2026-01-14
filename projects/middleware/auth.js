var requireAuth = function (req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/users/login');
    }
    next();
};

var loadUser = function (req, res, next) {
    if (req.session && req.session.userId) {
        var fs = require('fs');
        var path = require('path');
        var DATA_FILE = path.join(__dirname, '../data/users.json');

        try {
            var data = fs.readFileSync(DATA_FILE, 'utf8');
            var users = JSON.parse(data);
            req.user = users.find(u => u.id === req.session.userId);
        } catch (err) {
            req.user = null;
        }
    }
    next();
};

module.exports = {
    requireAuth: requireAuth,
    loadUser: loadUser
};

// Monkey-patch fs.rename to handle EXDEV errors on Windows
const fs = require('fs');
const origRename = fs.rename;
const origRenameSync = fs.renameSync;

fs.rename = function(oldPath, newPath, callback) {
  origRename(oldPath, newPath, function(err) {
    if (err && err.code === 'EXDEV') {
      fs.copyFile(oldPath, newPath, function(err2) {
        if (err2) return callback(err2);
        fs.unlink(oldPath, callback);
      });
    } else {
      callback(err);
    }
  });
};

fs.renameSync = function(oldPath, newPath) {
  try {
    return origRenameSync(oldPath, newPath);
  } catch(err) {
    if (err.code === 'EXDEV') {
      fs.copyFileSync(oldPath, newPath);
      fs.unlinkSync(oldPath);
    } else {
      throw err;
    }
  }
};

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'BTJGenshinPS-win32-ia32', 'locales');

fs.readdir(localesDir, (err, files) => {
  if (err) return console.error(err);

  const filesToKeep = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak'];

  files.forEach(file => {
    if (!filesToKeep.includes(file)) {
      fs.unlink(path.join(localesDir, file), err => {
        if (err) return console.error(err);
      });
    }
  });
});

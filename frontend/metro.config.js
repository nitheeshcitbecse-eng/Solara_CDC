const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// OneDrive turns synced files into cloud placeholders (reparse points). On Windows, Node's
// readdir then reports them as symlinks, and Metro fails with "EINVAL: readlink …index.js".
// lstat knows they are plain files, so ask it whenever readdir claims a symlink.
if (process.platform === "win32") {
  const fixEntries = (dir, entries) =>
    entries.map((entry) => {
      if (typeof entry === "string" || !entry.isSymbolicLink()) return entry;
      try {
        const stat = fs.lstatSync(path.join(dir, entry.name.toString()));
        if (stat.isSymbolicLink()) return entry;
        return Object.assign(Object.create(entry), {
          isSymbolicLink: () => false,
          isFile: () => stat.isFile(),
          isDirectory: () => stat.isDirectory(),
        });
      } catch {
        return entry;
      }
    });

  const readdir = fs.readdir;
  fs.readdir = function (dir, options, callback) {
    if (typeof options === "function" || !options?.withFileTypes) return readdir.apply(this, arguments);
    return readdir.call(this, dir, options, (err, entries) => callback(err, err ? entries : fixEntries(String(dir), entries)));
  };

  const readdirSync = fs.readdirSync;
  fs.readdirSync = function (dir, options) {
    const entries = readdirSync.apply(this, arguments);
    return options?.withFileTypes ? fixEntries(String(dir), entries) : entries;
  };
}

module.exports = getDefaultConfig(__dirname);

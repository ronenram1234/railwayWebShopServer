const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const logDirectory = ".\logs";
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

//log file path to log dir
const getLogFilePath = () => path.join(
    logDirectory,
    `${new Date().toLocaleDateString("en-CA")}.log`
  );


let logStream = null;
const getLogStream = () => {
  if (!logStream) { //create log file
    logStream = fs.createWriteStream(getLogFilePath(), { flags: "a" });
  }
  return logStream;
};


morgan.token("total-time", function (req, res) {
  return `${Date.now() - req.startTime} ms`; //calc time
});

const requestTimer = (req, res, next) => {
  req.startTime = Date.now();
  next();
};


const format = (tokens, req, res) =>
  [
    `[${new Date().toLocaleString()}]`, 
    `"${tokens.method(req, res)}"`, 
    tokens.url(req, res), 
    `Status: ${tokens.status(req, res)}`, 
    `Size: ${tokens.res(req, res, "content-length") || "0"} bytes`,
    `⏳ Time: ${tokens["total-time"](req, res)}`, 
  ].join(" | ");

const logger = morgan(format, { stream: process.stdout });

// bonus 2
const errorLogger = morgan(format, {
    stream: { write: (message) => getLogStream().write(message) }, 
    skip: (req, res) => res.statusCode < 400, 
  });

module.exports = { logger, requestTimer, errorLogger };

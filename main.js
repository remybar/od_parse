const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const USD_TO_EUR_RATE = /1 USD = (\d+\.\d+) EUR/;

function round_float(value) {
  return Math.floor(value * 1000.0) / 1000.0;
}

function get_rates(line) {
  const usd_to_eur = parseFloat(line.match(USD_TO_EUR_RATE)[1]);
  return {
    usd_to_eur,
    eur_to_usd: round_float(1 / usd_to_eur),
  };
}

async function parseFile(dirPath, filename) {
  const dataBuffer = fs.readFileSync(path.join(dirPath, filename));
  const pdfData = await pdfParse(dataBuffer);
  const lines = pdfData.text.split("\n");

  // extract USD/EUR rate
  const rateLines = lines.filter((l) => USD_TO_EUR_RATE.test(l));

  if (rateLines.length !== 1) {
    return Promise.reject({
      filename,
      reason: "No USD/EUR rate found for this invoice",
    });
  }

  const rates = get_rates(rateLines[0]);

  // TODO: invoice analysis
  // - export tokens list + number + USD value as CSV table
  // - show details on console

  return { filename, ...rates };
}

async function parseDir(dirPath) {
  fs.promises
    .readdir(dirPath)
    .then((filenames) =>
      Promise.allSettled(
        filenames
          .filter((f) => f.endsWith(".pdf"))
          .map((f) => parseFile(dirPath, f))
      )
    )
    .then((data) => {
      data.forEach((d) => {
        if (d.status === "fulfilled") {
          console.log(
            `${d.value.filename} - ${d.value.usd_to_eur} - ${d.value.eur_to_usd}`
          );
        } else {
          console.log(`${d.reason.filename} - not found`);
        }
      });
    })
    .catch((err) => {
      console.log("error: ", err);
    });
}

(async () => {
  const res = await parseDir("invoices");
})();

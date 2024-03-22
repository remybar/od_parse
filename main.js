require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");

const USD_TO_EUR_RATE = /1 USD = (\d+\.\d+) EUR/;
const TOTAL_IN_USD = /Total\W*(?:After Tax)?(\d*,*\d+\.*\d*) USD/;

function roundFloat(value, size = 3) {
  const roundor = Math.pow(10, size);
  return Math.floor(value * roundor) / roundor;
}

function getRates(lines) {
  const rateLines = lines.filter((l) => USD_TO_EUR_RATE.test(l));
  if (rateLines.length !== 1) return { usd_to_eur: false, eur_to_usd: false };

  const usd_to_eur = parseFloat(rateLines[0].match(USD_TO_EUR_RATE)[1]);
  return {
    usd_to_eur,
    eur_to_usd: roundFloat(1 / usd_to_eur),
  };
}

function getTotalInUSD(lines) {
  const totalLines = lines.filter((l) => TOTAL_IN_USD.test(l));
  if (totalLines.length !== 1) return false;

  const total = totalLines[0].match(TOTAL_IN_USD)[1].replace(",", "");
  return parseFloat(total);
}

async function parseFile(dirPath, filename) {
  const dataBuffer = fs.readFileSync(path.join(dirPath, filename));
  const pdfData = await pdfParse(dataBuffer);
  const lines = pdfData.text.split("\n");

  const rates = getRates(lines);
  const total_in_usd = getTotalInUSD(lines);

  return {
    filename,
    usd_to_eur: rates.usd_to_eur ? rates.usd_to_eur.toString() : "-",
    eur_to_usd: rates.eur_to_usd ? rates.eur_to_usd.toString() : "-",
    total_in_usd: total_in_usd ? total_in_usd.toString() : "-",
    total_in_eur: rates.usd_to_eur
      ? roundFloat(total_in_usd * rates.usd_to_eur, 2).toString()
      : "-",
  };
}

async function parseDir(dirPath) {
  fs.promises
    .readdir(dirPath)
    .then((filenames) =>
      Promise.all(
        filenames
          .filter((f) => f.endsWith(".pdf"))
          .map((f) => parseFile(dirPath, f))
      )
    )
    .then((data) => {
      const filename = "Invoice Name".padEnd(32, " ");
      const usd_to_eur = "USD/EUR".padStart(10, " ");
      const eur_to_usd = "EUR/USD".padStart(10, " ");
      const total_in_usd = "TOT. USD".padStart(8, " ");
      const total_in_eur = "TOT. EUR".padStart(8, " ");
      console.log(
        `${filename} | ${usd_to_eur} | ${eur_to_usd} | ${total_in_usd} | ${total_in_eur}`
      );
      console.log(
        "---------------------------------------------------------------------------------"
      );

      data.forEach((d) => {
        const filename = d.filename.padEnd(32, " ");
        const usd_to_eur = d.usd_to_eur.padStart(10, " ");
        const eur_to_usd = d.eur_to_usd.padStart(10, " ");
        const total_in_usd = d.total_in_usd.padStart(8, " ");
        const total_in_eur = d.total_in_eur.padStart(8, " ");

        console.log(
          `${filename} | ${usd_to_eur} | ${eur_to_usd} | ${total_in_usd} | ${total_in_eur}`
        );
      });
    })
    .catch((err) => {
      console.log("error: ", err);
    });
}

(async () => {
  const invoiceDir = process.env.INVOICE_DIR || "invoices";
  await parseDir(invoiceDir);
})();

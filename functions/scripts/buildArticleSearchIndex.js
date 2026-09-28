const { parseArgs } = require("node:util");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { SECTIONS, createArticleSearch } = require("../articleSearch");

async function main() {
  const { values } = parseArgs({ options: {
    project: { type: "string" }, bucket: { type: "string" },
    section: { type: "string", default: "all" }, rebuild: { type: "boolean", default: false },
  } });
  if (!values.project || !values.bucket || (values.section !== "all" && !SECTIONS.includes(values.section))) {
    throw new Error("Specify --project PROJECT_ID --bucket BUCKET --section all|news|encyclopedia|male_infertility [--rebuild]");
  }
  initializeApp({ projectId: values.project, storageBucket: values.bucket });
  const search = createArticleSearch({ db: getFirestore(), bucket: getStorage().bucket() });
  for (const section of values.section === "all" ? SECTIONS : [values.section]) {
    console.log(JSON.stringify(await search.bootstrap(section, { rebuild: values.rebuild })));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

const dns = require("node:dns/promises");
const http = require("node:http");
const https = require("node:https");
const { isIP } = require("node:net");
const ipaddr = require("ipaddr.js");
const sharp = require("sharp");

const LIMITS = Object.freeze({
  maxUrlLength: 4096,
  maxBytes: 9 * 1024 * 1024,
  maxRedirects: 3,
  timeoutMs: 20000,
  maxDimension: 8192,
  maxPixels: 16 * 1024 * 1024,
  maxFrames: 32,
});
const CONTENT_TYPES = Object.freeze({
  png: "image/png", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
});
const ERROR_MESSAGES = Object.freeze({
  "invalid-argument": "The remote image or its address is not supported.",
  "resource-exhausted": "The remote image exceeds the import limits.",
  "deadline-exceeded": "The remote image import timed out.",
  unavailable: "The remote image could not be downloaded.",
});

class RemoteImageError extends Error {
  constructor(code = "invalid-argument") {
    if (!Object.hasOwn(ERROR_MESSAGES, code)) code = "invalid-argument";
    super(ERROR_MESSAGES[code]);
    this.name = "RemoteImageError";
    this.code = code;
  }
}

function publicAddress(address) {
  if (!isIP(address)) return false;
  // Azure's platform virtual IP is not marked special by ordinary IP registries.
  if (address === "168.63.129.16") return false;
  const parsed = ipaddr.parse(address);
  if (parsed.range() !== "unicast") return false;
  // Only global IPv6 unicast, never mapped, transition or unallocated space.
  return parsed.kind() !== "ipv6" || parsed.match(ipaddr.parse("2000::"), 3);
}

function hostnameOf(url) {
  return url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
}

function normalizeSourceUrl(value) {
  if (typeof value !== "string" || !value || value.length > LIMITS.maxUrlLength ||
      /[\u0000-\u001f\u007f]/u.test(value)) throw new RemoteImageError();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new RemoteImageError();
  }
  if (!["https:", "http:"].includes(url.protocol) || url.port || url.username || url.password) {
    throw new RemoteImageError();
  }
  const hostname = hostnameOf(url);
  const bareHost = hostname.replace(/\.+$/u, "");
  if (!bareHost || /(^|\.)(localhost|local|internal)$/iu.test(bareHost) ||
      (isIP(hostname) && !publicAddress(hostname))) throw new RemoteImageError();
  url.hash = "";
  if (url.href.length > LIMITS.maxUrlLength) throw new RemoteImageError();
  return url.href;
}

function waitFor(promise, signal) {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new RemoteImageError("deadline-exceeded"));
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
    Promise.resolve(promise).then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", aborted);
    });
  });
}

async function resolveAddress(url, lookup, signal) {
  const hostname = hostnameOf(url);
  if (isIP(hostname)) return { address: hostname, family: isIP(hostname) };
  let answers;
  try {
    answers = await waitFor(lookup(hostname, { all: true, verbatim: true }), signal);
  } catch (error) {
    if (error instanceof RemoteImageError) throw error;
    throw new RemoteImageError("unavailable");
  }
  if (!Array.isArray(answers) || !answers.length ||
      answers.some(answer => !publicAddress(answer.address) || isIP(answer.address) !== answer.family)) {
    throw new RemoteImageError();
  }
  return answers[0];
}

function fetchImage(url, address, request, signal) {
  return new Promise((resolve, reject) => {
    let req;
    let response;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      if (error || result?.redirect) {
        response?.destroy();
        req?.destroy();
      }
      if (error) reject(error);
      else resolve(result);
    };
    const abort = () => finish(new RemoteImageError("deadline-exceeded"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    const hostname = hostnameOf(url);
    try {
      req = request({
        protocol: url.protocol,
        hostname,
        servername: isIP(hostname) ? "" : hostname,
        port: url.protocol === "https:" ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        agent: false,
        autoSelectFamily: false,
        family: address.family,
        rejectUnauthorized: true,
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/gif",
          "Accept-Encoding": "identity",
        },
        // Connect only to the address validated above, with no second DNS lookup.
        lookup(_hostname, options, callback) {
          if (typeof options === "function") { callback = options; options = {}; }
          if (options?.all) callback(null, [{ ...address }]);
          else callback(null, address.address, address.family);
        },
      }, incoming => {
        response = incoming;
        response.on("error", () => finish(new RemoteImageError("unavailable")));
        if (settled) { response.destroy(); return; }
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          const location = response.headers.location;
          if (typeof location !== "string" || !location || location.length > LIMITS.maxUrlLength) {
            finish(new RemoteImageError());
          } else {
            finish(null, { redirect: location });
          }
          return;
        }
        const encoding = response.headers["content-encoding"];
        const header = response.headers["content-type"];
        const contentType = typeof header === "string" ? header.split(";")[0].trim().toLowerCase() : "";
        if (response.statusCode !== 200 ||
            (encoding !== undefined && String(encoding).trim().toLowerCase() !== "identity") ||
            !Object.values(CONTENT_TYPES).includes(contentType)) {
          finish(new RemoteImageError());
          return;
        }
        const declared = response.headers["content-length"];
        if (declared !== undefined && (typeof declared !== "string" || !/^\d+$/u.test(declared))) {
          finish(new RemoteImageError());
          return;
        }
        const expectedSize = declared === undefined ? null : Number(declared);
        if (expectedSize !== null && (!Number.isSafeInteger(expectedSize) || expectedSize > LIMITS.maxBytes)) {
          finish(new RemoteImageError("resource-exhausted"));
          return;
        }
        let length = 0;
        const chunks = [];
        response.on("data", chunk => {
          if (settled) return;
          length += chunk.length;
          if (length > LIMITS.maxBytes) {
            finish(new RemoteImageError("resource-exhausted"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          if (!length || response.complete === false || (expectedSize !== null && length !== expectedSize)) {
            finish(new RemoteImageError());
          } else {
            finish(null, { bytes: Buffer.concat(chunks, length), contentType });
          }
        });
        response.on("aborted", () => finish(new RemoteImageError()));
        response.on("close", () => { if (!settled) finish(new RemoteImageError()); });
      });
      req.on("error", () => finish(new RemoteImageError("unavailable")));
      req.end();
    } catch {
      finish(new RemoteImageError("unavailable"));
    }
  });
}

function signatureFormat(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const start = bytes.subarray(0, 6).toString("ascii");
  if (start === "GIF87a" || start === "GIF89a") return "gif";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new RemoteImageError();
}

function validatePngChunks(bytes) {
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    offset += length + 12;
    // libvips does not decode APNG frames; do not bless an unchecked animation.
    if (offset > bytes.length || ["acTL", "fcTL", "fdAT"].includes(type)) throw new RemoteImageError();
    if (type === "IEND") {
      if (length !== 0 || offset !== bytes.length) throw new RemoteImageError();
      return;
    }
  }
  throw new RemoteImageError();
}

async function validateImage(result, signal, deadline) {
  if (signal.aborted || Date.now() >= deadline) throw new RemoteImageError("deadline-exceeded");
  const format = signatureFormat(result.bytes);
  if (CONTENT_TYPES[format] !== result.contentType) throw new RemoteImageError();
  if (format === "png") validatePngChunks(result.bytes);
  const decoder = sharp(result.bytes, {
    animated: true, failOn: "warning", limitInputPixels: LIMITS.maxPixels,
    sequentialRead: true,
  });
  const abort = () => decoder.destroy();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const metadata = await waitFor(decoder.metadata(), signal);
    if (metadata.format !== format) throw new RemoteImageError();
    const frames = metadata.pages || 1;
    const height = metadata.pageHeight || metadata.height;
    const pixels = metadata.width * height * frames;
    if (!Number.isSafeInteger(pixels) || pixels < 1 || pixels > LIMITS.maxPixels ||
        metadata.width > LIMITS.maxDimension || height > LIMITS.maxDimension || frames > LIMITS.maxFrames) {
      throw new RemoteImageError("resource-exhausted");
    }
    if (signal.aborted || Date.now() >= deadline) throw new RemoteImageError("deadline-exceeded");
    // Full raster decoding catches corruption beyond metadata. Store the original bytes.
    await waitFor(decoder.timeout({ seconds: Math.max(1, Math.ceil((deadline - Date.now()) / 1000)) })
      .raw({ depth: "uchar" }).toBuffer(), signal);
    if (signal.aborted || Date.now() >= deadline) throw new RemoteImageError("deadline-exceeded");
    return result;
  } catch (error) {
    if (error instanceof RemoteImageError) throw error;
    if (signal.aborted) throw new RemoteImageError("deadline-exceeded");
    if (/pixel limit/iu.test(error.message)) throw new RemoteImageError("resource-exhausted");
    throw new RemoteImageError();
  } finally {
    signal.removeEventListener("abort", abort);
    decoder.destroy();
  }
}

function createRemoteArticleImageDownloader({
  lookup = dns.lookup,
  httpRequest = http.request,
  httpsRequest = https.request,
  timeoutMs = LIMITS.timeoutMs,
} = {}) {
  return async function download(sourceUrl) {
    const controller = new AbortController();
    const deadline = Date.now() + timeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let url = new URL(normalizeSourceUrl(sourceUrl));
      for (let redirects = 0; ; redirects++) {
        if (Date.now() >= deadline) throw new RemoteImageError("deadline-exceeded");
        const address = await resolveAddress(url, lookup, controller.signal);
        if (Date.now() >= deadline) throw new RemoteImageError("deadline-exceeded");
        const result = await fetchImage(url, address,
          url.protocol === "https:" ? httpsRequest : httpRequest, controller.signal);
        if (!result.redirect) return await validateImage(result, controller.signal, deadline);
        if (redirects >= LIMITS.maxRedirects) throw new RemoteImageError();
        let next;
        try {
          next = new URL(normalizeSourceUrl(new URL(result.redirect, url).href));
        } catch {
          throw new RemoteImageError();
        }
        if (url.protocol === "https:" && next.protocol !== "https:") throw new RemoteImageError();
        url = next;
      }
    } catch (error) {
      if (error instanceof RemoteImageError) throw new RemoteImageError(error.code);
      throw new RemoteImageError("unavailable");
    } finally {
      clearTimeout(timer);
    }
  };
}

module.exports = {
  createRemoteArticleImageDownloader, normalizeSourceUrl, RemoteImageError, LIMITS, CONTENT_TYPES,
};

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { FiSearch, FiDownload, FiArrowLeft, FiCalendar, FiEdit3, FiLock, FiUnlock } from "react-icons/fi";
import baseUrl, { formatStoreDisplayName } from "../../api/api";

const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

function canonFixes(s) {
  return s
    .replace(/\bedap{1,2}a?l{1,3}y\b/g, "edappally")
    .replace(/\bedap{1,2}a?l{1,3}i\b/g, "edappally")
    .replace(/\bmanjeri\b/g, "manjery")
    .replace(/\bperinthalmana\b/g, "perinthalmanna")
    .replace(/\bkottakal\b/g, "kottakkal")
    .replace(/\bkalpeta\b/g, "kalpetta")
    .replace(/\bzoruc+i\b/g, "zorucci");
}

function norm(s) {
  const x = String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return canonFixes(x);
}

function locationKey(name) {
  return norm(name)
    .split(" ")
    .filter((t) => t && !BRAND_TOKENS.has(t))
    .join(" ");
}

function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const parseWeekDays = (val) => {
  if (!val || val === "Select Days") return { start: null, end: null };
  const digits = String(val).match(/\d+/g);
  if (digits && digits.length >= 2) {
    const start = parseInt(digits[0], 10);
    const end = parseInt(digits[1], 10);
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }
  return { start: null, end: null };
};

const isWalkinCreatedInRange = (dateVal, startStr, endStr) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const ymd = `${year}-${month}-${day}`;
  return ymd >= startStr && ymd <= endStr;
};

const BRANCH_LOCATION_MAPPING = {
  // Z-Edappally (loc 1)
  "z-edapally1": "1", "z-edappally1": "1", "z edapally1": "1", "z edappally1": "1",
  "zorucci edappally": "1", "zorucci edapally": "1", "z.edappally": "1", "z.edapally": "1",
  // G-Edappally (loc 3)
  "g-edappally": "3", "g edappally": "3", "grooms edappally": "3", "suitor guy edappally": "3",
  "sg.edappally": "3", "sg edappally": "3", "sg.edapally": "3", "sg edapally": "3",
  // G-Trivandrum (loc 5)
  "g-trivandrum": "5", "g.trivandrum": "5", "g trivandrum": "5",
  "grooms trivandrum": "5", "suitor guy trivandrum": "5", "sg.trivandrum": "5", "sg trivandrum": "5", "sg.tvm": "5",
  // Z-Edappal (loc 6)
  "z- edappal": "6", "z.edappal": "6", "z edappal": "6", "zorucci edappal": "6",
  // Z-Perinthalmanna (loc 7)
  "z.perinthalmanna": "7", "z perinthalmanna": "7", "zorucci perinthalmanna": "7", "z.perinthalmana": "7",
  // Z-Kottakkal (loc 8)
  "z.kottakkal": "8", "z kottakkal": "8", "zorucci kottakkal": "8",
  // G-Kottayam (loc 9)
  "g.kottayam": "9", "g kottayam": "9", "grooms kottayam": "9", "suitor guy kottayam": "9", "sg.kottayam": "9", "sg kottayam": "9",
  // G-Perumbavoor (loc 10)
  "g.perumbavoor": "10", "g perumbavoor": "10", "grooms perumbavoor": "10", "suitor guy perumbavoor": "10", "sg.perumbavoor": "10", "sg perumbavoor": "10",
  // G-Thrissur (loc 11)
  "g.thrissur": "11", "g thrissur": "11", "grooms thrissur": "11", "suitor guy thrissur": "11", "sg.thrissur": "11", "sg thrissur": "11", "sg.tsr": "11",
  // G-Chavakkad (loc 12)
  "g.chavakkad": "12", "g chavakkad": "12", "grooms chavakkad": "12", "suitor guy chavakkad": "12", "sg.chavakkad": "12", "sg chavakkad": "12",
  // G-Calicut (loc 13)
  "g.calicut": "13", "g calicut": "13", "grooms calicut": "13", "suitor guy calicut": "13", "sg.calicut": "13", "sg calicut": "13",
  // G-Vadakara (loc 14)
  "g.vadakara": "14", "g vadakara": "14", "grooms vadakara": "14", "suitor guy vadakara": "14", "sg.vadakara": "14", "sg vadakara": "14",
  // G-Edappal (loc 15)
  "g.edappal": "15", "g edappal": "15", "grooms edappal": "15", "suitor guy edappal": "15", "sg.edappal": "15", "sg edappal": "15",
  // G-Perinthalmanna (loc 16)
  "g.perinthalmanna": "16", "g perinthalmanna": "16", "grooms perinthalmanna": "16", "suitor guy perinthalmanna": "16",
  "sg.perinthalmanna": "16", "sg perinthalmanna": "16", "sg-perinthalmanna": "16", "sg.perinthalmana": "16", "sg perinthalmana": "16", "sg.pma": "16", "sg pma": "16",
  // G-Kottakkal (loc 17)
  "g.kottakkal": "17", "g kottakkal": "17", "grooms kottakkal": "17", "suitor guy kottakkal": "17", "sg.kottakkal": "17", "sg kottakkal": "17", "sg.ktk": "17",
  // G-Manjeri (loc 18)
  "g.manjeri": "18", "g manjeri": "18", "grooms manjeri": "18", "suitor guy manjeri": "18", "sg.manjeri": "18", "sg manjeri": "18",
  // G-Palakkad (loc 19)
  "g.palakkad": "19", "g palakkad": "19", "grooms palakkad": "19", "suitor guy palakkad": "19", "sg.palakkad": "19", "sg palakkad": "19", "sg.pkd": "19",
  // G-Kalpetta (loc 20)
  "g.kalpetta": "20", "g kalpetta": "20", "grooms kalpetta": "20", "suitor guy kalpetta": "20", "sg.kalpetta": "20", "sg kalpetta": "20",
  // G-Kannur (loc 21)
  "g.kannur": "21", "g kannur": "21", "grooms kannur": "21", "suitor guy kannur": "21", "sg.kannur": "21", "sg kannur": "21", "sg.knr": "21",
  // G-MG Road (loc 23)
  "g.mg road": "23", "g.mgroad": "23", "g mg road": "23", "gmg road": "23", "grooms mg road": "23", "suitor guy mg road": "23", "sg.mg road": "23", "sg.mgroad": "23", "sg mg road": "23",
  // Dappr Squad (loc 25)
  "dappr squad": "25", "crsrootments": "25"
};

// Maps Dappr Squad (loc 25) bookingBy names → the target store locId they belong to
const DAPPR_SQUAD_STORE_MAPPING = {
  // G-Edappally (loc 3)
  "sg.edappally": "3",
  "sg.edapally": "3",
  "sg.edappaly": "3",
  // G-Perumbavoor (loc 10)
  "sg.perumbavoor": "10",
  "sg.perumbavur": "10",
  // G-Thrissur (loc 11)
  "sg.thrissur": "11",
  "sg.tsr": "11",
  // G-Chavakkad (loc 12)
  "sg.chavakkad": "12",
  "sg.chavakad": "12",
  // G-Calicut (loc 13)
  "sg.calicut": "13",
  "sg.kozhikode": "13",
  // G-Vadakara (loc 14)
  "sg.vadakara": "14",
  // G-Edappal (loc 15)
  "sg.edappal": "15",
  // G-Perinthalmanna (loc 16)
  "sg.perinthalmanna": "16",
  "sg.perinthalmana": "16",
  "sg.pma": "16",
  // G-Kottakkal (loc 17)
  "sg.kottakkal": "17",
  "sg.kottakal": "17",
  "sg.ktk": "17",
  // G-Manjeri (loc 18)
  "sg.manjeri": "18",
  "sg.manjery": "18",
  // G-Palakkad (loc 19)
  "sg.palakkad": "19",
  "sg.palakad": "19",
  "sg.pkd": "19",
  // G-Kalpetta (loc 20)
  "sg.kalpetta": "20",
  "sg.kalpeta": "20",
  // G-Kannur (loc 21)
  "sg.kannur": "21",
  "sg.knr": "21",
  // G-Trivandrum (loc 5)
  "sg.trivandrum": "5",
  "sg.tvm": "5",
  "sg.trivandum": "5",
  "sg.trivandurm": "5",
  "sg.thiruvananthapuram": "5",
  "sg.tvpm": "5",
  // G-Kottayam (loc 9)
  "sg.kottayam": "9",
  "sg.ktm": "9",
  // G-MG Road (loc 23)
  "sg.mg road": "23",
  "sg.mgroad": "23",
  "sg.mg.road": "23",
  "sg.mgrd": "23",
  // Z-Edapally1 (loc 1)
  "sg.edapally1": "1",
};

// Get all Dappr Squad entries from loc 25 that belong to a given store locId
function getDapprSquadDataForStore(locId, dapprList) {
  return dapprList.filter(item => {
    const raw = String(item.bookingBy || "").trim().toLowerCase();

    // 1. Direct exact match
    if (DAPPR_SQUAD_STORE_MAPPING[raw] === locId) return true;

    // 2. Normalize: strip all non-alphanumeric, re-insert dot after "sg"
    const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
    if (alphaOnly.startsWith("sg")) {
      const dotted = "sg." + alphaOnly.slice(2);
      if (DAPPR_SQUAD_STORE_MAPPING[dotted] === locId) return true;
    }

    // 3. Abbreviation expansion: map short codes to locIds directly
    const abbrevMap = {
      "tvm": "5", "tvpm": "5", "trivandum": "5", "trivandurm": "5",
      "tsr": "11", "pkd": "19", "ktk": "17", "ktm": "9",
      "knr": "21", "pma": "16", "mgroad": "23", "mgrd": "23",
    };
    if (alphaOnly.startsWith("sg")) {
      const code = alphaOnly.slice(2);
      if (abbrevMap[code] === locId) return true;
    }

    return false;
  });
}

function getBranchLocationId(workingBranch) {
  if (!workingBranch) return null;
  const raw = String(workingBranch).trim().toLowerCase();
  if (BRANCH_LOCATION_MAPPING[raw]) return BRANCH_LOCATION_MAPPING[raw];

  const normClean = raw
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^grooms/, "g")
    .replace(/^suitorguy/, "g")
    .replace(/^sg/, "g")
    .replace(/^zorucci/, "z");

  const NORM_LOCATION_MAPPING = {
    "zedapally1": "1",
    "zedappally1": "1",
    "gedappally": "3",
    "gtrivandrum": "5",
    "zedappal": "6",
    "zperinthalmanna": "7",
    "zkottakkal": "8",
    "gkottayam": "9",
    "gperumbavoor": "10",
    "gthrissur": "11",
    "gchavakkad": "12",
    "gcalicut": "13",
    "gvadakara": "14",
    "gedappal": "15",
    "gperinthalmanna": "16",
    "gperinthalmana": "16",
    "gkottakkal": "17",
    "gmanjeri": "18",
    "gmanjery": "18",
    "gpalakkad": "19",
    "gkalpetta": "20",
    "gkannur": "21",
    "gmgroad": "23",
    "dapprsquad": "25"
  };

  return NORM_LOCATION_MAPPING[normClean] || null;
}

const STORE_TO_LOC_CODE = {
  "zedapally1": "144",
  "zedappally1": "144",
  "gedappally": "702",
  "sgedappally": "702",
  "gtrivandrum": "700",
  "sgtrivandrum": "700",
  "zedappal": "100",
  "zperinthalmanna": "133",
  "zkottakkal": "122",
  "gkottayam": "701",
  "sgkottayam": "701",
  "gperumbavoor": "703",
  "sgperumbavoor": "703",
  "gthrissur": "704",
  "sgthrissur": "704",
  "gchavakkad": "706",
  "sgchavakkad": "706",
  "gcalicut": "712",
  "sgcalicut": "712",
  "gvadakara": "708",
  "sgvadakara": "708",
  "gvatakara": "708",
  "sgvatakara": "708",
  "vatakara": "708",
  "vadakara": "708",
  "gedappal": "707",
  "sgedappal": "707",
  "gperinthalmanna": "709",
  "sgperinthalmanna": "709",
  "gkottakkal": "711",
  "sgkottakkal": "711",
  "gmanjeri": "710",
  "sgmanjeri": "710",
  "gpalakkad": "705",
  "sgpalakkad": "705",
  "gkalpetta": "717",
  "sgkalpetta": "717",
  "gkannur": "716",
  "sgkannur": "716",
  "gmgroad": "718",
  "sgmgroad": "718"
};

function getBranchLocCode(workingBranch, branchesList) {
  if (!workingBranch) return null;
  const str = String(workingBranch).trim().toLowerCase();
  
  const found = (branchesList || []).find(
    (b) => String(b.workingBranch).trim().toLowerCase() === str || String(b.locCode) === str
  );
  if (found && found.locCode) return String(found.locCode);

  const cleanLoc = str.replace(/^(suitor guy|grooms|zorucci|sg|g|z)[\.\-\s]*/i, "").replace(/vatakara/g, "vadakara").replace(/[^a-z0-9]/g, "");
  const normalized = str.replace(/[^a-z0-9]/g, "");

  if (STORE_TO_LOC_CODE[normalized]) return String(STORE_TO_LOC_CODE[normalized]);
  if (cleanLoc && STORE_TO_LOC_CODE[`sg${cleanLoc}`]) return String(STORE_TO_LOC_CODE[`sg${cleanLoc}`]);
  if (cleanLoc && STORE_TO_LOC_CODE[`g${cleanLoc}`]) return String(STORE_TO_LOC_CODE[`g${cleanLoc}`]);
  if (cleanLoc && STORE_TO_LOC_CODE[`z${cleanLoc}`]) return String(STORE_TO_LOC_CODE[`z${cleanLoc}`]);

  if (branchesList && cleanLoc) {
    const matchedBranch = branchesList.find(b => {
      const bClean = String(b.workingBranch || '').toLowerCase().replace(/^(suitor guy|grooms|zorucci|sg|g|z)[\.\-\s]*/i, "").replace(/[^a-z0-9]/g, "");
      return bClean === cleanLoc || (bClean && cleanLoc.includes(bClean)) || (cleanLoc && bClean.includes(cleanLoc));
    });
    if (matchedBranch && matchedBranch.locCode) return String(matchedBranch.locCode);
  }

  return null;
}

const runWithConcurrencyLimit = async (tasks, limit) => {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes memory cache

const getPerformanceCached = async (locId, startDate, endDate, forceRefresh = false) => {
  const cacheKey = `perfnc_${locId}_${startDate}_${endDate}`;
  if (!window.__performanceCache) {
    window.__performanceCache = {};
  }
  
  const existing = window.__performanceCache[cacheKey];
  if (!forceRefresh && existing) {
    if (existing.data && (Date.now() - existing.timestamp < CACHE_TTL_MS)) {
      return existing.data;
    }
    if (existing.promise) {
      return existing.promise;
    }
  }

  const promise = (async () => {
    try {
      const res = await fetch("https://rentalapi.rootments.live/api/Reports/GetPerformanceStaffReportWithCancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          DateFrom: startDate,
          DateTo: endDate,
          BookingNo: "",
          LocationID: locId,
          UserID: "7777"
        })
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.dataSet?.data || [];
        window.__performanceCache[cacheKey] = {
          data,
          timestamp: Date.now()
        };
        return data;
      }
    } catch (err) {
      console.error(`Error in getPerformanceCached for loc ${locId}:`, err);
      delete window.__performanceCache[cacheKey];
    }
    return [];
  })();

  window.__performanceCache[cacheKey] = {
    promise,
    timestamp: Date.now()
  };

  return promise;
};




function displayBranchName(name) {
  return formatStoreDisplayName(name);
}

function isHiddenBranch(name) {
  const normalized = norm(name);
  // Non-sales branches: hide from all report views
  const nonSalesBranches = ["office", "production", "warehouse"];
  if (nonSalesBranches.includes(normalized)) return true;
  // Any test store
  if (normalized.startsWith("test ") || normalized.startsWith("test")) {
    const afterTest = normalized.replace(/^test\s*/, "").trim();
    if (afterTest.length > 0) return true;
  }
  return (
    normalized === norm("Suitor Guy Kochi") ||
    normalized === norm("GROOMS Kochi") ||
    normalized === norm("Grooms Kochi") ||
    normalized === norm("Suitor Guy Calicut") ||
    normalized === norm("GROOMS Calicut") ||
    normalized === norm("Grooms Calicut")
  );
}

function isStoreOrBranchName(name, branchesList = []) {
  if (!name || typeof name !== "string") return false;
  const str = name.trim();
  if (!str || str.toLowerCase() === "none" || str.toLowerCase() === "unassigned") return false;

  if (isHiddenBranch(str)) return true;

  const normName = norm(str);
  const legacyStoreNorms = [
    norm("Suitor Guy Calicut"), norm("SG Calicut"), norm("Grooms Calicut"), norm("G-Calicut"), norm("SG-Calicut"), norm("Calicut"),
    norm("Suitor Guy Kochi"), norm("SG Kochi"), norm("Grooms Kochi"), norm("G-Kochi"), norm("SG-Kochi"), norm("Kochi"),
    "office", "production", "warehouse"
  ];
  if (legacyStoreNorms.includes(normName)) return true;

  if (Array.isArray(branchesList) && branchesList.length > 0) {
    const matchesBranch = branchesList.some(b => {
      const bDisp = displayBranchName(b.workingBranch);
      return norm(bDisp) === normName || norm(b.workingBranch) === normName;
    });
    if (matchesBranch) return true;
  }

  return false;
}

function normalizeForMatch(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(suitorguy|grooms|zorucci|sg|g)/, "g")
    .replace(/^dapper/, "dappr");
}
const STAFF_ALIAS_MAPPING = {
  // Ashiq
  "mohammed ashiq s": "M ASHIQ S",
  "mohammed ashiq": "M ASHIQ S",
  "mohammedashiqs": "M ASHIQ S",
  "mohammedashiq": "M ASHIQ S",
  "mohammad ashiq s": "M ASHIQ S",
  "mohammad ashiq": "M ASHIQ S",
  "m ashiq s": "M ASHIQ S",
  "mashiqs": "M ASHIQ S",
  "m ashiq": "M ASHIQ S",
  "mashiq": "M ASHIQ S",
  "ashiq": "M ASHIQ S",

  // Aslam A S (Chavakkad)
  "mohamed aslam a s": "Mohamed Aslam A S",
  "mohamedaslamas": "Mohamed Aslam A S",
  "mohamed aslam as": "Mohamed Aslam A S",
  "aslam as": "Mohamed Aslam A S",
  "aslamas": "Mohamed Aslam A S",

  // Aslam V B (Chavakkad)
  "muhammed aslam vb": "MUHAMMED ASLAM VB",
  "muhammedaslamvb": "MUHAMMED ASLAM VB",
  "muhammad aslam vb": "MUHAMMED ASLAM VB",
  "muhammadaslamvb": "MUHAMMED ASLAM VB",
  "aslam vb": "MUHAMMED ASLAM VB",
  "aslamvb": "MUHAMMED ASLAM VB",

  // Akash VK
  "akash vk": "AKASH VK",
  "akash v k": "AKASH VK",
  "akashvk": "AKASH VK",
  "akash": "AKASH VK",
  "ak": "AKASH VK",

  // Sajith K
  "sajith k": "SAJITH K",
  "sajithk": "SAJITH K",
  "sajith": "SAJITH K",
  "sk": "SAJITH K",

  // Abdul Hadi
  "abdul hadi rafeeque": "Abdul Hadi Rafeeque",
  "abdul hadi": "Abdul Hadi Rafeeque",
  "abdulhadi": "Abdul Hadi Rafeeque",
  "hadi": "Abdul Hadi Rafeeque",

  // Suvinesh
  "suvinesh k": "SUVINESH",
  "suvinesh": "SUVINESH",

  // Niyas
  "niyas dinu nasar k": "NIYAS",
  "niyas dinu nasar": "NIYAS",
  "niyasdinunasark": "NIYAS",
  "niyasdinunasar": "NIYAS",
  "niyas": "NIYAS",

  // Shamil
  "m shamil k p": "M SHAMIL K P",
  "mshamilkp": "M SHAMIL K P",
  "muhammed shamil k p": "M SHAMIL K P",
  "muhammedshamilkp": "M SHAMIL K P",
  "shamil k p": "M SHAMIL K P",
  "shamilkp": "M SHAMIL K P",
  "shamil": "M SHAMIL K P",

  // Shahil
  "shahil shan v": "SHAHIL SHAN",
  "shahilshanv": "SHAHIL SHAN",
  "shahil shan": "SHAHIL SHAN",
  "shahilshan": "SHAHIL SHAN",

  // Riswan
  "m riswan": "MOHAMMAD RISWAN",
  "mriswan": "MOHAMMAD RISWAN",
  "riswan": "MOHAMMAD RISWAN",
  "mohammad riswan": "MOHAMMAD RISWAN",
  "mohammed riswan": "MOHAMMAD RISWAN",

  // Shan
  "m shan k": "M SHAN K",
  "mshank": "M SHAN K",
  "muhammed shan k": "M SHAN K",
  "muhammedshank": "M SHAN K",
  "shan k": "M SHAN K",
  "shank": "M SHAN K",
  "shan": "M SHAN K",

  // Faris
  "s faris vk": "S FARIS VK",
  "sfarisvk": "S FARIS VK",
  "salmanul faris v k": "S FARIS VK",
  "salmanulfarisvk": "S FARIS VK",
  "salman faris v k": "S FARIS VK",
  "salmanfarisvk": "S FARIS VK",
  "salman faris": "S FARIS VK",
  "salmanfaris": "S FARIS VK",
  "faris": "S FARIS VK",

  // Salman
  "salman muhammed v": "SALMAN MUHAMMED.V",
  "salmanmuhammedv": "SALMAN MUHAMMED.V",
  "salman muhammed": "SALMAN MUHAMMED.V",
  "salmanmuhammed": "SALMAN MUHAMMED.V",

  // Basil
  "muhammed basil p k": "Muhammed Basil P K",
  "muhammedbasilpk": "Muhammed Basil P K",
  "muhammed basil": "Muhammed Basil P K",
  "muhammedbasil": "Muhammed Basil P K",
  "basil": "Muhammed Basil P K",

  // Shabir
  "muhammad shabir vt": "SHABIR VT",
  "muhammadshabirvt": "SHABIR VT",
  "shabir vt": "SHABIR VT",
  "shabirvt": "SHABIR VT",
  "shabir": "SHABIR VT",

  // Devadath
  "devadeth r": "DEVADATH",
  "devadethr": "DEVADATH",
  "devadeth": "DEVADATH",
  "devadath r": "DEVADATH",
  "devadathr": "DEVADATH",


  // Anshif
  "muhammed anshif c.k": "ANSHIF C.K",
  "muhammed anshif ck": "ANSHIF C.K",
  "muhammedanshifck": "ANSHIF C.K",
  "m anshif ck": "ANSHIF C.K",
  "manshifck": "ANSHIF C.K",
  "anshif c.k": "ANSHIF C.K",
  "anshif ck": "ANSHIF C.K",
  "anshif": "ANSHIF C.K",

  // Afsal
  "mohammed afsal v l": "AFSAL",
  "mohammed afsal": "AFSAL",
  "mohammedafsal": "AFSAL",
  "afsal": "AFSAL",

  // Thahseen
  "muhammad thahseen p": "THAHSEEN P",
  "muhammadthahseenp": "THAHSEEN P",
  "thahseen p": "THAHSEEN P",
  "thahseen": "THAHSEEN P",
  "thahaseen": "THAHSEEN P",

  // Sidheeq
  "sidheek": "SIDHEEQ",
  "sidheeq": "SIDHEEQ",
  "sidheek k": "SIDHEEQ",
  "sidheeq k": "SIDHEEQ",
  "sidheeqk": "SIDHEEQ",
  "sidheekk": "SIDHEEQ",

  // Deepak
  "deepak nh": "DEEPAK N H",
  "deepak n h": "DEEPAK N H",
  "deepaknh": "DEEPAK N H",

  // Shamnad
  "shamnad as": "Shamnad A S",
  "shamnad a s": "Shamnad A S",
  "shamnadas": "Shamnad A S",

  // Jaseena
  "jaseena p": "JASEENA",
  "jaseenap": "JASEENA",

  // Nayana
  "nayana t s": "NAYANA TS",
  "nayanats": "NAYANA TS",

  // Al Shifna
  "al shifna v s": "AL SHIFNA VS",
  "al shifna vs": "AL SHIFNA VS",
  "alshifnavs": "AL SHIFNA VS",
  "al shifna": "AL SHIFNA VS",
  "alshifna": "AL SHIFNA VS",

  // Angel
  "angel p saji": "ANGEL P SAJI",
  "angelpsaji": "ANGEL P SAJI",

  // Alphin
  "alphin biju": "ALPHIN BIJU",
  "alphinbiju": "ALPHIN BIJU",
  "alphin": "ALPHIN BIJU",

  // Amal
  "amal k manoj": "AMAL K MANOJ",
  "amalkmanoj": "AMAL K MANOJ",
  "amal k": "AMAL K MANOJ",
  "amalk": "AMAL K MANOJ",
  "amal": "AMAL K MANOJ",

  // Abhijith
  "abhijith kumar p a": "ABHIJITH KUMAR P A",
  "abhijithkumarpa": "ABHIJITH KUMAR P A",
  "abhijith kumar": "ABHIJITH KUMAR P A",
  "abhijithkumar": "ABHIJITH KUMAR P A",
  "abhijith": "ABHIJITH KUMAR P A",

  // Aswin
  "aswin raj m. r": "ASWIN RAJ M. R",
  "aswin raj m.r": "ASWIN RAJ M. R",
  "aswin raj m r": "ASWIN RAJ M. R",
  "aswin raj mr": "ASWIN RAJ M. R",
  "aswinrajmr": "ASWIN RAJ M. R",
  "aswin raj": "ASWIN RAJ M. R",
  "aswinraj": "ASWIN RAJ M. R",
  "aswin": "ASWIN RAJ M. R",

  // Reshma
  "reshma m": "RESHMA M",
  "reshmam": "RESHMA M"
};


function getCanonicalStaffName(rawName) {
  if (!rawName) return "";
  const str = String(rawName).trim();
  const lower = str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  if (STAFF_ALIAS_MAPPING[lower]) {
    return STAFF_ALIAS_MAPPING[lower];
  }
  const normKey = lower.replace(/\s+/g, "");
  if (STAFF_ALIAS_MAPPING[normKey]) {
    return STAFF_ALIAS_MAPPING[normKey];
  }
  return str;
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function isStaffNameMatch(strA, strB) {
  if (!strA || !strB) return false;

  const rawA = String(strA).trim();
  const rawB = String(strB).trim();
  if (rawA.toLowerCase() === rawB.toLowerCase()) return true;

  const canonA = getCanonicalStaffName(rawA);
  const canonB = getCanonicalStaffName(rawB);
  if (canonA.toLowerCase() === canonB.toLowerCase()) return true;

  const normA = normalizeForMatch(canonA);
  const normB = normalizeForMatch(canonB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  if (typeof isStoreAliasName === "function" && (isStoreAliasName(strA) !== isStoreAliasName(strB))) return false;

  const cleanTokens = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const tokensA = cleanTokens(canonA);
  const tokensB = cleanTokens(canonB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const strAlphaA = tokensA.join("");
  const strAlphaB = tokensB.join("");

  if (strAlphaA === strAlphaB) return true;

  const TITLES = new Set(["muhammed", "mohammad", "mohammed", "md", "m"]);
  const isTitleToken = (t) => TITLES.has(t);

  // Core name match ignoring leading titles (e.g., "m ashiq s" vs "mohammed ashiq s")
  const coreA = tokensA.filter(t => !isTitleToken(t)).join("");
  const coreB = tokensB.filter(t => !isTitleToken(t)).join("");
  if (coreA.length >= 4 && coreA === coreB) {
    return true;
  }

  // 1. Concatenated prefix/substring check (e.g., Jishnuraj vs Jishnu vs Jishnu Raj K)
  if (strAlphaA.length >= 5 && strAlphaB.length >= 5) {
    if (strAlphaA.startsWith(strAlphaB) || strAlphaB.startsWith(strAlphaA)) {
      const diff = Math.abs(strAlphaA.length - strAlphaB.length);
      if (diff <= 3) return true;
    }
  }

  // Helper to extract explicit non-title initials
  const initialsOf = (tokens) => tokens.filter(t => t.length <= 2 && !isTitleToken(t)).join("");
  const initA = initialsOf(tokensA);
  const initB = initialsOf(tokensB);
  if (initA.length > 0 && initB.length > 0 && initA !== initB) {
    return false; // Conflicting initials e.g. A S vs V B -> DIFFERENT STAFF!
  }

  // 2. Levenshtein distance for spelling typos (e.g., THAHSEEN P vs THAHASEEN)
  if (Math.abs(strAlphaA.length - strAlphaB.length) <= 3) {
    const dist = levenshteinDistance(strAlphaA, strAlphaB);
    if (dist <= 2 && Math.min(strAlphaA.length, strAlphaB.length) >= 5) {
      return true;
    }
  }

  // 3. Common tokens check with substantial token matching
  const common = tokensA.filter(t => tokensB.includes(t));
  const unsharedA = tokensA.filter(t => !tokensB.includes(t));
  const unsharedB = tokensB.filter(t => !tokensA.includes(t));

  if (unsharedA.length > 0 && unsharedB.length > 0) {
    if (
      (unsharedA.length === 1 && isTitleToken(unsharedA[0]) && unsharedB.length === 1 && isTitleToken(unsharedB[0])) ||
      (unsharedA.length === 1 && isTitleToken(unsharedA[0]) && unsharedB.every(isTitleToken)) ||
      (unsharedB.length === 1 && isTitleToken(unsharedB[0]) && unsharedA.every(isTitleToken))
    ) {
      return true;
    }
  }

  const substantialCommon = common.filter(t => t.length >= 4 && !TITLES.has(t));
  if (substantialCommon.length > 0) {
    const isInitialsOrSuffix = (t) => TITLES.has(t) || t.length <= 2 || ["raj", "kumar"].includes(t);
    if (unsharedA.every(isInitialsOrSuffix) && unsharedB.every(isInitialsOrSuffix)) {
      return true;
    }
  }

  return false;
}

function normalizeEmpCode(code) {
  if (!code) return "";
  const str = String(code).trim().toUpperCase();
  const digits = str.replace(/[^0-9]/g, "");
  if (digits.length > 0) {
    return `EMP${parseInt(digits, 10)}`;
  }
  return str.replace(/[^A-Z0-9]/g, "");
}

function extractWalkinEmpCodes(w, empNameToCodeMap) {
  if (!w) return [];
  const codes = [];
  [w.empCode, w.empId, w.empID, w.EmpId, w.employeeId, w.emp_code].forEach(val => {
    if (val) codes.push(normalizeEmpCode(val));
  });
  if (w.createdBy && typeof w.createdBy === "object") {
    [w.createdBy.empID, w.createdBy.EmpId, w.createdBy.employeeId, w.createdBy.empCode, w.createdBy.emp_code].forEach(val => {
      if (val) codes.push(normalizeEmpCode(val));
    });
    if (w.createdBy.name && empNameToCodeMap) {
      const code = empNameToCodeMap.get(getCanonicalStaffName(w.createdBy.name).toLowerCase()) || empNameToCodeMap.get(normalizeForMatch(w.createdBy.name));
      if (code) codes.push(code);
    }
  } else if (typeof w.createdBy === "string" && empNameToCodeMap) {
    const code = empNameToCodeMap.get(getCanonicalStaffName(w.createdBy).toLowerCase()) || empNameToCodeMap.get(normalizeForMatch(w.createdBy));
    if (code) codes.push(code);
  }

  if (w.staffId && typeof w.staffId === "object") {
    [w.staffId.empID, w.staffId.EmpId, w.staffId.employeeId, w.staffId.empCode, w.staffId.emp_code].forEach(val => {
      if (val) codes.push(normalizeEmpCode(val));
    });
  }

  const wStaff = w.staff || w.staffName || w.managerName;
  if (wStaff && empNameToCodeMap) {
    const code = empNameToCodeMap.get(getCanonicalStaffName(wStaff).toLowerCase()) || empNameToCodeMap.get(normalizeForMatch(wStaff));
    if (code) codes.push(code);
  }

  return Array.from(new Set(codes.filter(Boolean)));
}

function deduplicateStaffNames(rawNamesList, systemEmpNameToCodeMap = null, systemEmpCodeToNameMap = null) {
  if (!Array.isArray(rawNamesList)) return [];

  const cleanList = rawNamesList
    .filter(name => typeof name === "string" && name.trim() !== "" && name.trim().toLowerCase() !== "none" && name.trim().toLowerCase() !== "unassigned")
    .map(name => name.trim());

  const uniqueList = [];

  cleanList.forEach(rawName => {
    const canon = getCanonicalStaffName(rawName);
    const normKey = normalizeForMatch(canon);
    let officialName = canon;

    if (systemEmpNameToCodeMap && typeof systemEmpNameToCodeMap.get === "function") {
      const empCode = systemEmpNameToCodeMap.get(canon.toLowerCase()) || systemEmpNameToCodeMap.get(normKey);
      if (empCode && systemEmpCodeToNameMap && typeof systemEmpCodeToNameMap.get === "function") {
        const sysName = systemEmpCodeToNameMap.get(empCode);
        if (sysName && isStaffNameMatch(sysName, canon)) {
          officialName = sysName;
        }
      }
    }

    const existing = uniqueList.find(existingName => {
      if (existingName === officialName || existingName === rawName || existingName === canon) return true;
      if (normalizeForMatch(existingName) === normalizeForMatch(canon)) return true;
      return isStaffNameMatch(existingName, rawName) || isStaffNameMatch(existingName, officialName) || isStaffNameMatch(existingName, canon);
    });

    if (!existing) {
      uniqueList.push(officialName);
    }
  });

  return uniqueList;
}

function isStoreAliasName(rawName) {
  if (!rawName) return false;
  const normStr = String(rawName).trim().toLowerCase();
  if (DAPPR_SQUAD_STORE_MAPPING[normStr]) return true;
  const alphaOnly = normStr.replace(/[^a-z0-9]/g, "");
  if (alphaOnly.startsWith("sg")) {
    const code = alphaOnly.slice(2);
    const storeAbbrevs = [
      "edappally", "edapally", "edapally1", "edappally1", "trivandrum", "tvm", "tvpm",
      "edappal", "perinthalmanna", "perinthalmana", "pma", "kottakkal", "kottakal", "ktk",
      "kottayam", "ktm", "perumbavoor", "perumbavur", "thrissur", "tsr", "chavakkad", "chavakad",
      "calicut", "kozhikode", "vadakara", "manjeri", "manjery", "palakkad", "palakad", "pkd",
      "kalpetta", "kalpeta", "kannur", "knr", "mgroad", "mgrd"
    ];
    if (storeAbbrevs.includes(code)) return true;
  }
  return false;
}

function getStoreCustomizationTotal(storeName, storeCustomizationTotals) {
  if (!storeName || !storeCustomizationTotals) return {};
  const normTarget = normalizeForMatch(storeName).replace(/edappally/g, "edapally");
  const targetLoc = getBranchLocationId(storeName);

  if (storeCustomizationTotals[normTarget]) return storeCustomizationTotals[normTarget];
  if (storeCustomizationTotals[normalizeForMatch(storeName)]) return storeCustomizationTotals[normalizeForMatch(storeName)];

  const matchedKey = Object.keys(storeCustomizationTotals).find(k => {
    if (!k) return false;
    const normK = normalizeForMatch(k).replace(/edappally/g, "edapally");
    if (normK === normTarget) return true;
    if (normK.replace(/1$/, '') === normTarget.replace(/1$/, '')) return true;
    const kLoc = getBranchLocationId(k);
    if (kLoc && targetLoc && kLoc === targetLoc) return true;
    return false;
  });

  return matchedKey ? storeCustomizationTotals[matchedKey] : {};
}

const CURRENT_MONTH_LONG = new Date().toLocaleString("en-US", { month: "long" });
const CURRENT_MONTH_SHORT = new Date().toLocaleString("en-US", { month: "short" });
const CURRENT_YEAR = new Date().getFullYear();

const getMonthNameFromDateStr = (dateStr) => {
  if (!dateStr) return CURRENT_MONTH_LONG;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return CURRENT_MONTH_LONG;
  return d.toLocaleString("en-US", { month: "long" });
};

const getYearFromDateStr = (dateStr) => {
  if (!dateStr) return CURRENT_YEAR;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return CURRENT_YEAR;
  return d.getFullYear();
};

const getClusterForStoreName = (name) => {
  const norm = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Zorucci stores
  if (norm.startsWith("z")) {
    return "Zorucci";
  }
  
  // South Cluster stores
  const southStores = [
    "gedappally", "sgedappally", "edappally", "edapally",
    "gtrivandrum", "sgtrivandrum", "trivandrum", "tvm",
    "gkottayam", "sgkottayam", "kottayam", "ktm",
    "gperumbavoor", "sgperumbavoor", "perumbavoor", "perumbavur",
    "gthrissur", "sgthrissur", "thrissur", "tsr",
    "gchavakkad", "sgchavakkad", "chavakkad", "chavakad",
    "gpalakkad", "sgpalakkad", "palakkad", "palakad", "pkd",
    "gmgroad", "sgmgroad", "mgroad"
  ];
  if (southStores.some(s => norm === s || norm.includes(s))) {
    return "South Cluster";
  }
  
  // North Cluster stores
  const northStores = [
    "gcalicut", "sgcalicut", "calicut", "kozhikode",
    "gvadakara", "sgvadakara", "vadakara",
    "gedappal", "sgedappal", "edappal",
    "gperinthalmanna", "sgperinthalmanna", "perinthalmanna", "perinthalmana", "pma",
    "gkottakkal", "sgkottakkal", "kottakkal", "ktk",
    "gmanjeri", "sgmanjeri", "manjeri",
    "gkalpetta", "sgkalpetta", "kalpetta",
    "gkannur", "sgkannur", "kannur", "knr"
  ];
  if (northStores.some(s => norm === s || norm.includes(s))) {
    return "North Cluster";
  }
  
  return "Unassigned";
};

const getDaysCountInMonth = (monthName, year = CURRENT_YEAR) => {
  const months = {
    January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
    July: 31, August: 31, September: 30, October: 31, November: 30, December: 31
  };
  if (monthName === "February") {
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
      return 29;
    }
    return 28;
  }
  return months[monthName] || 30;
};

const getAutoWeekDates = (monthName, year = CURRENT_YEAR) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIdx = monthNames.indexOf(monthName);
  const effectiveMonthIdx = monthIdx !== -1 ? monthIdx : new Date().getMonth();
  const d = new Date(year, effectiveMonthIdx, 1);
  const monthShort = d.toLocaleString("en-US", { month: "short" });
  const daysInMonth = getDaysCountInMonth(monthName, year);
  
  return {
    1: `01 - 07 ${monthShort}`,
    2: `08 - 14 ${monthShort}`,
    3: `15 - 21 ${monthShort}`,
    4: `22 - ${String(daysInMonth).padStart(2, "0")} ${monthShort}`
  };
};

const sortStoresGThenZ = (a, b) => {
  const getStoreStr = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "object") {
      return (val.name || val.storeName || val.workingBranch || val.label || "").trim();
    }
    return String(val).trim();
  };
  const strA = getStoreStr(a);
  const strB = getStoreStr(b);
  const isZ_A = /^z/i.test(strA);
  const isZ_B = /^z/i.test(strB);
  if (!isZ_A && isZ_B) return -1;
  if (isZ_A && !isZ_B) return 1;
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
};

const DSRReport = () => {
  const user = useSelector((state) => state.auth.user);
  const isAdminOrSuperAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "it_admin";
  const isStoreAdmin = user?.role === "store_admin";
  const isClusterAdmin = user?.role === "cluster_admin";
  const [branches, setBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const targetInputRef = useRef(null);
  const [clusters, setClusters] = useState([]);
  const [selectedClusters, setSelectedClusters] = useState(["All"]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState(["All"]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const selectedStore = selectedStores.length === 1 && !selectedStores.includes("All") ? selectedStores[0] : "All";
  const [selectedReport, setSelectedReport] = useState("Revenue Vs Target");
  const [activeTab, setActiveTab] = useState("MTD");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => getLocalDateString(new Date()));
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(customStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(customEndDate);
  const [customApplied, setCustomApplied] = useState(false);
  const todayStr = getLocalDateString(new Date());

  const getCustomDateRangeString = () => {
    const sStr = customApplied ? appliedStartDate : customStartDate;
    const eStr = customApplied ? appliedEndDate : customEndDate;
    if (!sStr || !eStr) return "Custom Range";
    const start = new Date(sStr);
    const end = new Date(eStr);
    
    const startMonth = start.toLocaleString("en-US", { month: "long" });
    const startDay = String(start.getDate()).padStart(2, "0");
    const startYear = start.getFullYear();
    
    const endMonth = end.toLocaleString("en-US", { month: "long" });
    const endDay = String(end.getDate()).padStart(2, "0");
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  };
  
  // Custom dropdown states
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [funnelView, setFunnelView] = useState("Rental"); // "Rental" vs "Consolidated"
  const [funnelDropdownOpen, setFunnelDropdownOpen] = useState(false);

  const clusterDropdownRef = useRef(null);
  const storeDropdownRef = useRef(null);
  const reportDropdownRef = useRef(null);
  const funnelDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clusterDropdownRef.current && !clusterDropdownRef.current.contains(e.target)) {
        setIsClusterDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
        setIsStoreDropdownOpen(false);
      }
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(e.target)) {
        setReportDropdownOpen(false);
      }
      if (funnelDropdownRef.current && !funnelDropdownRef.current.contains(e.target)) {
        setFunnelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Assign target modal states
  const [assignTargetModalOpen, setAssignTargetModalOpen] = useState(false);
  const [modalStore, setModalStore] = useState("");
  const [modalMonth, setModalMonth] = useState(CURRENT_MONTH_LONG);
  const [modalTarget, setModalTarget] = useState("");
  const [targetAssignMode, setTargetAssignMode] = useState("Store"); // "Store" | "Staff"
  const [modalStaff, setModalStaff] = useState("");
  const [activeWeeks, setActiveWeeks] = useState([1]);

  const defaultAutoWeeks = getAutoWeekDates(CURRENT_MONTH_LONG, CURRENT_YEAR);
  const [week1Dates, setWeek1Dates] = useState(() => localStorage.getItem("week1Dates") || defaultAutoWeeks[1]);
  const [week2Dates, setWeek2Dates] = useState(() => localStorage.getItem("week2Dates") || defaultAutoWeeks[2]);
  const [week3Dates, setWeek3Dates] = useState(() => localStorage.getItem("week3Dates") || defaultAutoWeeks[3]);
  const [week4Dates, setWeek4Dates] = useState(() => localStorage.getItem("week4Dates") || defaultAutoWeeks[4]);

  // Local modal week date states
  const [modalWeek1, setModalWeek1] = useState(defaultAutoWeeks[1]);
  const [modalWeek2, setModalWeek2] = useState(defaultAutoWeeks[2]);
  const [modalWeek3, setModalWeek3] = useState(defaultAutoWeeks[3]);
  const [modalWeek4, setModalWeek4] = useState(defaultAutoWeeks[4]);

  const [storeWeekRanges, setStoreWeekRanges] = useState(() => {
    try {
      const stored = localStorage.getItem("storeWeekRanges");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [weeklyTargets, setWeeklyTargets] = useState(() => {
    try {
      const stored = localStorage.getItem("weeklyTargets");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [employeeTargets, setEmployeeTargets] = useState(() => {
    try {
      const stored = localStorage.getItem("employeeTargets");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const getStoreWeekRange = (storeName, monthName = CURRENT_MONTH_LONG) => {
    if (!storeName) return null;

    const tryMatch = (name) => {
      if (!name) return null;
      const dispName = displayBranchName(name);
      const snorm = name.replace(/[.\-]/g, '-');
      const normKey = normalizeForMatch(name);

      const keysToTry = Array.from(new Set([name, dispName, snorm, normKey].filter(Boolean)));
      for (const k of keysToTry) {
        if (storeWeekRanges[k]) {
          const storeVal = storeWeekRanges[k];
          if (storeVal[monthName] && (storeVal[monthName][1] || storeVal[monthName][2] || storeVal[monthName][3] || storeVal[monthName][4])) {
            return storeVal[monthName];
          }
          if (storeVal[1] || storeVal[2] || storeVal[3] || storeVal[4]) return storeVal;
        }
      }

      const matchKey = Object.keys(storeWeekRanges).find(
        k => k === name || k === snorm || (normKey && normalizeForMatch(k) === normKey)
      );
      if (matchKey && storeWeekRanges[matchKey]) {
        const storeVal = storeWeekRanges[matchKey];
        if (storeVal[monthName] && (storeVal[monthName][1] || storeVal[monthName][2] || storeVal[monthName][3] || storeVal[monthName][4])) {
          return storeVal[monthName];
        }
        if (storeVal[1] || storeVal[2] || storeVal[3] || storeVal[4]) return storeVal;
      }
      return null;
    };

    const exactMatch = tryMatch(storeName);
    const allMatch = tryMatch("All");

    if (exactMatch && storeName !== "All") return exactMatch;
    if (allMatch) return allMatch;
    if (exactMatch) return exactMatch;

    return null;
  };

  const getStoreEmployeeTargets = (storeName) => {
    if (!storeName || storeName === "All") return [];
    if (employeeTargets[storeName] && employeeTargets[storeName].length > 0) return employeeTargets[storeName];
    const dispName = displayBranchName(storeName);
    if (dispName && employeeTargets[dispName] && employeeTargets[dispName].length > 0) return employeeTargets[dispName];
    const snorm = storeName.replace(/[.\-]/g, '-');
    if (snorm && employeeTargets[snorm] && employeeTargets[snorm].length > 0) return employeeTargets[snorm];
    const normKey = normalizeForMatch(storeName);
    if (normKey && employeeTargets[normKey] && employeeTargets[normKey].length > 0) return employeeTargets[normKey];

    const matchingKeys = Object.keys(employeeTargets).filter(
      k => k === storeName || k === snorm || (normKey && normalizeForMatch(k) === normKey)
    );
    if (matchingKeys.length === 0) return [];
    const keyWithEmps = matchingKeys.find(k => employeeTargets[k] && employeeTargets[k].length > 0);
    return keyWithEmps ? employeeTargets[keyWithEmps] : employeeTargets[matchingKeys[0]] || [];
  };

  const getStoreWeeklyTargets = (storeName) => {
    if (!storeName) return {};
    // 1. Exact match
    if (weeklyTargets[storeName]) return weeklyTargets[storeName];
    // 2. Display branch name match
    const dispName = displayBranchName(storeName);
    if (dispName && weeklyTargets[dispName]) return weeklyTargets[dispName];
    // 3. Dot-to-dash normalized match
    const snorm = storeName.replace(/[.\-]/g, '-');
    if (snorm && weeklyTargets[snorm]) return weeklyTargets[snorm];
    // 4. Normalized key match
    const normKey = normalizeForMatch(storeName);
    if (normKey && weeklyTargets[normKey]) return weeklyTargets[normKey];

    // 5. Fallback search prioritizing entries with non-zero weekly targets
    const matchingKeys = Object.keys(weeklyTargets).filter(
      k => k === storeName || k === snorm || (normKey && normalizeForMatch(k) === normKey)
    );
    if (matchingKeys.length === 0) return {};

    const keyWithTargets = matchingKeys.find(k => {
      const obj = weeklyTargets[k];
      return obj && [1, 2, 3, 4].some(w => Number(obj[w] || 0) > 0);
    });

    return keyWithTargets ? weeklyTargets[keyWithTargets] : weeklyTargets[matchingKeys[0]] || {};
  };

  const getCurrentWeekId = (storeName = "All", targetMonthName = CURRENT_MONTH_LONG) => {
    const today = new Date();
    const todayDateNum = today.getDate();
    const daysInMonth = getDaysCountInMonth(targetMonthName);

    let w1 = week1Dates;
    let w2 = week2Dates;
    let w3 = week3Dates;
    let w4 = week4Dates;

    const sr = getStoreWeekRange(storeName, targetMonthName);
    if (sr) {
      if (sr[1]) w1 = sr[1];
      if (sr[2]) w2 = sr[2];
      if (sr[3]) w3 = sr[3];
      if (sr[4]) w4 = sr[4];
    }

    const parseRange = (val, weekId) => {
      let { start: startDay, end: endDay } = parseWeekDays(val);
      if (startDay === null || endDay === null || isNaN(startDay) || isNaN(endDay)) {
        if (weekId === 1) { startDay = 1; endDay = 7; }
        else if (weekId === 2) { startDay = 8; endDay = 14; }
        else if (weekId === 3) { startDay = 15; endDay = 21; }
        else { startDay = 22; endDay = daysInMonth; }
      }
      return { startDay, endDay };
    };

    const weeks = [
      { id: 1, range: parseRange(w1, 1) },
      { id: 2, range: parseRange(w2, 2) },
      { id: 3, range: parseRange(w3, 3) },
      { id: 4, range: parseRange(w4, 4) }
    ];

    for (const w of weeks) {
      if (w.range.startDay !== null && w.range.endDay !== null) {
        if (todayDateNum >= w.range.startDay && todayDateNum <= w.range.endDay) {
          return w.id;
        }
      }
    }
    // Fallback: find the week whose range is closest (handles gaps between custom week configs)
    let nearest = 4;
    let minDist = Infinity;
    for (const w of weeks) {
      if (w.range.startDay !== null && w.range.endDay !== null) {
        const midpoint = (w.range.startDay + w.range.endDay) / 2;
        const dist = Math.abs(todayDateNum - midpoint);
        if (dist < minDist) {
          minDist = dist;
          nearest = w.id;
        }
      }
    }
    return nearest;
  };
  // getTargetForRange: Accepts Date objects (start, end) and calculates prorated target day-by-day
  // Used by getStoreTarget (MTD/WTD) and getStaffTarget (MTD/WTD)
  const getTargetForRange = (storeName, start, end, overrideTargetObj = null) => {
    if (!start || !end) return 0;

    const targetMonth = start.getMonth();
    const targetMonthName = start.toLocaleString("en-US", { month: "long" });
    const targetYearNum = start.getFullYear();

    const autoWeeks = getAutoWeekDates(targetMonthName, targetYearNum);

    let w1 = autoWeeks[1], w2 = autoWeeks[2], w3 = autoWeeks[3], w4 = autoWeeks[4];

    if (storeName && storeName !== "All") {
      const sr = getStoreWeekRange(storeName, targetMonthName);
      if (sr) {
        if (sr[1] && sr[1] !== "Select Days") w1 = sr[1];
        if (sr[2] && sr[2] !== "Select Days") w2 = sr[2];
        if (sr[3] && sr[3] !== "Select Days") w3 = sr[3];
        if (sr[4] && sr[4] !== "Select Days") w4 = sr[4];
      }
    }

    const parseRange = (val, weekId) => {
      let { start: startDay, end: endDay } = parseWeekDays(val);
      if (startDay === null || endDay === null || isNaN(startDay) || isNaN(endDay)) {
        if (weekId === 1) { startDay = 1; endDay = 7; }
        else if (weekId === 2) { startDay = 8; endDay = 14; }
        else if (weekId === 3) { startDay = 15; endDay = 21; }
        else { startDay = 22; endDay = getDaysCountInMonth(targetMonthName, targetYearNum); }
      }
      return { startDay, endDay, count: (endDay - startDay + 1) };
    };

    const wRanges = {
      1: parseRange(w1, 1),
      2: parseRange(w2, 2),
      3: parseRange(w3, 3),
      4: parseRange(w4, 4),
    };

    const storeTargetObj = overrideTargetObj || getStoreWeeklyTargets(storeName);

    let totalTarget = 0;
    let temp = new Date(start);
    while (temp <= end) {
      const dayNum = temp.getDate();
      const tempMonth = temp.getMonth();
      if (tempMonth === targetMonth) {
        let foundWeekId = null;
        for (let wId = 1; wId <= 4; wId++) {
          const r = wRanges[wId];
          if (dayNum >= r.startDay && dayNum <= r.endDay) {
            foundWeekId = wId;
            break;
          }
        }
        if (foundWeekId) {
          const targetW = storeTargetObj[foundWeekId] || storeTargetObj[String(foundWeekId)] || 0;
          const daysInW = wRanges[foundWeekId].count || 7;
          totalTarget += targetW / daysInW;
        }
      }
      temp.setDate(temp.getDate() + 1);
    }
    return Math.round(totalTarget);
  };

  const getCustomRangeTarget = (storeName, startDateStr, endDateStr, overrideTargetObj = null) => {
    if (!startDateStr || !endDateStr) return 0;

    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    // Parse the week date ranges for the store
    const targetMonth = start.getMonth(); // target month is the month of custom range start date
    const targetMonthName = start.toLocaleString("en-US", { month: "long" });
    const targetYearNum = start.getFullYear();
    const autoWeeks = getAutoWeekDates(targetMonthName, targetYearNum);
    
    const week1DatesVal = localStorage.getItem("week1Dates") || autoWeeks[1];
    const week2DatesVal = localStorage.getItem("week2Dates") || autoWeeks[2];
    const week3DatesVal = localStorage.getItem("week3Dates") || autoWeeks[3];
    const week4DatesVal = localStorage.getItem("week4Dates") || autoWeeks[4];

    let w1 = week1DatesVal && week1DatesVal !== "Select Days" ? week1DatesVal : autoWeeks[1];
    let w2 = week2DatesVal && week2DatesVal !== "Select Days" ? week2DatesVal : autoWeeks[2];
    let w3 = week3DatesVal && week3DatesVal !== "Select Days" ? week3DatesVal : autoWeeks[3];
    let w4 = week4DatesVal && week4DatesVal !== "Select Days" ? week4DatesVal : autoWeeks[4];

    if (storeName !== "All") {
      const sr = getStoreWeekRange(storeName);
      if (sr) {
        if (sr[1] && sr[1] !== "Select Days") w1 = sr[1];
        if (sr[2] && sr[2] !== "Select Days") w2 = sr[2];
        if (sr[3] && sr[3] !== "Select Days") w3 = sr[3];
        if (sr[4] && sr[4] !== "Select Days") w4 = sr[4];
      }
    }
    
    const parseRange = (val, weekId) => {
      let { start: startDay, end: endDay } = parseWeekDays(val);
      
      if (startDay === null || endDay === null || isNaN(startDay) || isNaN(endDay)) {
        if (weekId === 1) { startDay = 1; endDay = 7; }
        else if (weekId === 2) { startDay = 8; endDay = 14; }
        else if (weekId === 3) { startDay = 15; endDay = 21; }
        else if (weekId === 4) { 
          startDay = 22; 
          endDay = getDaysCountInMonth(targetMonthName, targetYearNum); 
        }
      }
      return { startDay, endDay, count: (endDay - startDay + 1) };
    };
    
    const wRanges = {
      1: parseRange(w1, 1),
      2: parseRange(w2, 2),
      3: parseRange(w3, 3),
      4: parseRange(w4, 4),
    };
    
    const storeTargetObj = overrideTargetObj || getStoreWeeklyTargets(storeName);
    
    // Sum daily target contributions
    let totalTarget = 0;
    
    // Loop through each day from start to end
    let temp = new Date(start);
    while (temp <= end) {
      const dayNum = temp.getDate();
      const tempMonth = temp.getMonth();
      // Ensure we only sum for the target month
      if (tempMonth === targetMonth) {
        // Find which week contains this day
        let foundWeekId = null;
        for (let wId = 1; wId <= 4; wId++) {
          const r = wRanges[wId];
          if (dayNum >= r.startDay && dayNum <= r.endDay) {
            foundWeekId = wId;
            break;
          }
        }
        
        if (foundWeekId) {
          const targetW = storeTargetObj[foundWeekId] || storeTargetObj[String(foundWeekId)] || 0;
          const daysInW = wRanges[foundWeekId].count || 7;
          totalTarget += targetW / daysInW;
        }
      }
      
      // Move to next day
      temp.setDate(temp.getDate() + 1);
    }
    
    return Math.round(totalTarget);
  };

  const getStoreTarget = (storeName, defaultTarget, activeTabVal, customFactorVal) => {
    const storeTargetObj = getStoreWeeklyTargets(storeName);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // MTD: Prorated daily sum from 1st of the month up to today
    if (activeTabVal === "MTD") {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = getDaysCountInMonth(CURRENT_MONTH_LONG, currentYear);
      const monthEnd = new Date(currentYear, currentMonth, lastDayOfMonth);
      const endDate = today > monthEnd ? monthEnd : (today < monthStart ? monthStart : today);
      
      // Only use simple proration if no weekly targets are stored at all
      const hasAnyWeekTarget = [1, 2, 3, 4].some(wId => {
        const v = storeTargetObj[wId] !== undefined ? storeTargetObj[wId] : storeTargetObj[String(wId)];
        return v !== undefined && Number(v) > 0;
      });
      if (!hasAnyWeekTarget && defaultTarget) {
        const daysInMonth = getDaysCountInMonth(CURRENT_MONTH_LONG, currentYear);
        const elapsedDays = Math.max(1, Math.min(daysInMonth, today.getDate()));
        return Math.round((defaultTarget / daysInMonth) * elapsedDays);
      }
      if (!hasAnyWeekTarget) return 0;
      
      return getTargetForRange(storeName, monthStart, endDate);
    }
    
    // WTD: Prorated from active week start up to today using week range dates
    if (activeTabVal === "WTD") {
      const currentWeekId = getCurrentWeekId(storeName);
      const weekRangesObj = getStoreWeekRange(storeName);

      let activeWeekRangeStr = weekRangesObj ? (weekRangesObj[currentWeekId] || weekRangesObj[String(currentWeekId)]) : null;
      if (!activeWeekRangeStr || activeWeekRangeStr === "Select Days") {
        const daysInMonth = getDaysCountInMonth(CURRENT_MONTH_LONG, currentYear);
        if (currentWeekId === 1) activeWeekRangeStr = "01 - 07";
        else if (currentWeekId === 2) activeWeekRangeStr = "08 - 14";
        else if (currentWeekId === 3) activeWeekRangeStr = "15 - 21";
        else activeWeekRangeStr = `22 - ${daysInMonth}`;
      }

      const { start: startDay, end: endDay } = parseWeekDays(activeWeekRangeStr);
      if (startDay !== null && endDay !== null && !isNaN(startDay) && !isNaN(endDay)) {
        const weekStart = new Date(currentYear, currentMonth, startDay);
        const weekEnd = new Date(currentYear, currentMonth, endDay);
        const endDate = today > weekEnd ? weekEnd : (today < weekStart ? weekStart : today);
        if (today >= weekStart) {
          return getTargetForRange(storeName, weekStart, endDate);
        }
      }

      const val = storeTargetObj[currentWeekId] !== undefined ? storeTargetObj[currentWeekId] : storeTargetObj[String(currentWeekId)];
      const fullWTarget = (val !== undefined && val !== null) ? Number(val) : (defaultTarget ? Math.round(defaultTarget * 0.23) : 0);
      if (fullWTarget === 0) return 0;
      const startDayFallback = currentWeekId === 1 ? 1 : (currentWeekId === 2 ? 8 : (currentWeekId === 3 ? 15 : 22));
      const elapsedDays = Math.max(1, Math.min(7, today.getDate() - startDayFallback + 1));
      return Math.round((fullWTarget / 7) * elapsedDays);
    }

    if (activeTabVal === "Custom") {
      return getCustomRangeTarget(storeName, customStartDate, customEndDate);
    }
    
    return defaultTarget;
  };

  const getStaffTarget = (storeName, staffName, activeTabVal) => {
    const storeEmpTargets = getStoreEmployeeTargets(storeName);
    const matchingEmpTs = storeEmpTargets.filter(
      e => e && (
        e.staffName === staffName ||
        normalizeForMatch(e.staffName) === normalizeForMatch(staffName) ||
        getCanonicalStaffName(e.staffName) === getCanonicalStaffName(staffName) ||
        isStaffNameMatch(e.staffName, staffName)
      )
    );

    if (matchingEmpTs.length === 0) return 0; // No explicit target

    // Merge weeklyTargets across matching entries if variations exist
    const empTargetObj = { 1: 0, 2: 0, 3: 0, 4: 0 };
    matchingEmpTs.forEach(e => {
      if (e && e.weeklyTargets) {
        [1, 2, 3, 4].forEach(wk => {
          const val = Number(e.weeklyTargets[wk] || e.weeklyTargets[String(wk)] || 0);
          if (val > 0) empTargetObj[wk] = Math.max(empTargetObj[wk], val);
        });
      }
    });

    const hasAnyTarget = [1, 2, 3, 4].some(wk => (empTargetObj[wk] || 0) > 0);
    if (!hasAnyTarget) return 0;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (activeTabVal === "MTD") {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = getDaysCountInMonth(CURRENT_MONTH_LONG, currentYear);
      const monthEnd = new Date(currentYear, currentMonth, lastDayOfMonth);
      const endDate = today > monthEnd ? monthEnd : (today < monthStart ? monthStart : today);
      return getTargetForRange(storeName, monthStart, endDate, empTargetObj);
    }

    if (activeTabVal === "WTD") {
      const currentWeekId = getCurrentWeekId(storeName);
      const weekRangesObj = getStoreWeekRange(storeName);

      let activeWeekRangeStr = weekRangesObj ? (weekRangesObj[currentWeekId] || weekRangesObj[String(currentWeekId)]) : null;
      if (!activeWeekRangeStr || activeWeekRangeStr === "Select Days") {
        const daysInMonth = getDaysCountInMonth(CURRENT_MONTH_LONG, currentYear);
        if (currentWeekId === 1) activeWeekRangeStr = "01 - 07";
        else if (currentWeekId === 2) activeWeekRangeStr = "08 - 14";
        else if (currentWeekId === 3) activeWeekRangeStr = "15 - 21";
        else activeWeekRangeStr = `22 - ${daysInMonth}`;
      }

      const { start: startDay, end: endDay } = parseWeekDays(activeWeekRangeStr);
      if (startDay !== null && endDay !== null && !isNaN(startDay) && !isNaN(endDay)) {
        const weekStart = new Date(currentYear, currentMonth, startDay);
        const weekEnd = new Date(currentYear, currentMonth, endDay);
        const endDate = today > weekEnd ? weekEnd : (today < weekStart ? weekStart : today);
        if (today >= weekStart) {
          return getTargetForRange(storeName, weekStart, endDate, empTargetObj);
        }
      }

      const val = empTargetObj[currentWeekId] !== undefined ? empTargetObj[currentWeekId] : empTargetObj[String(currentWeekId)];
      const fullWTarget = val !== undefined && val !== null ? Number(val) : 0;
      if (fullWTarget === 0) return 0;
      const startDayFallback = currentWeekId === 1 ? 1 : (currentWeekId === 2 ? 8 : (currentWeekId === 3 ? 15 : 22));
      const elapsedDays = Math.max(1, Math.min(7, today.getDate() - startDayFallback + 1));
      return Math.round((fullWTarget / 7) * elapsedDays);
    }

    if (activeTabVal === "Custom") {
      const startDateStr = customApplied ? (appliedStartDate || customStartDate) : (customStartDate || appliedStartDate);
      const endDateStr = customApplied ? (appliedEndDate || customEndDate || appliedStartDate || customStartDate) : (customEndDate || customStartDate || appliedEndDate || appliedStartDate);
      return getCustomRangeTarget(storeName, startDateStr, endDateStr, empTargetObj);
    }

    return 0;
  };

  const handleSubmitTarget = async (store, val, month) => {
    const cleanVal = String(val || "").replace(/[^0-9.-]/g, "");
    const parsed = Number(cleanVal);
    
    // Save targets
    if (val !== undefined && val !== null && val.trim() !== "" && !isNaN(parsed)) {
      const updatedTargets = { ...weeklyTargets };
      const updatedEmpTargets = { ...employeeTargets };

      const storeNorm = store.replace(/[.\-]/g, '-');
      const normKey = normalizeForMatch(store);
      const dispName = displayBranchName(store);
      const matchingBranch = branches.find(b => displayBranchName(b.workingBranch) === store || b.workingBranch === store || normalizeForMatch(b.workingBranch) === normKey);
      const branchWorking = matchingBranch ? matchingBranch.workingBranch : null;
      const allKeysToUpdate = Array.from(new Set([store, dispName, branchWorking, storeNorm, normKey].filter(Boolean)));
      
      if (targetAssignMode === "Staff") {
        if (!modalStaff) {
          alert("Please select a staff member.");
          return;
        }
        
        let existingEmpList = [];
        for (const k of allKeysToUpdate) {
          if (updatedEmpTargets[k] && updatedEmpTargets[k].length > 0) {
            existingEmpList = updatedEmpTargets[k];
            break;
          }
        }

        const storeEmpTargets = [...existingEmpList];
        const staffIndex = storeEmpTargets.findIndex(t => t.staffName === modalStaff || getCanonicalStaffName(t.staffName) === getCanonicalStaffName(modalStaff) || isStaffNameMatch(t.staffName, modalStaff));
        
        if (staffIndex >= 0) {
          const empT = { ...storeEmpTargets[staffIndex] };
          empT.weeklyTargets = { ...empT.weeklyTargets };
          activeWeeks.forEach((wk) => {
            empT.weeklyTargets[wk] = parsed;
          });
          storeEmpTargets[staffIndex] = empT;
        } else {
          const empT = {
            staffName: modalStaff,
            weeklyTargets: { 1: 0, 2: 0, 3: 0, 4: 0 }
          };
          activeWeeks.forEach((wk) => {
            empT.weeklyTargets[wk] = parsed;
          });
          storeEmpTargets.push(empT);
        }
        
        allKeysToUpdate.forEach(k => {
          updatedEmpTargets[k] = storeEmpTargets;
        });

        setEmployeeTargets(updatedEmpTargets);
        localStorage.setItem("employeeTargets", JSON.stringify(updatedEmpTargets));
        
        await saveStoreTargetToDb(store, updatedTargets, storeWeekRanges, month, CURRENT_YEAR, updatedEmpTargets);

      } else {
        // Store mode
        if (store === "All") {
          const allObj = { ...(updatedTargets["All"] || {}) };
          activeWeeks.forEach((wk) => {
            allObj[wk] = parsed;
          });
          updatedTargets["All"] = allObj;

          storeOptions.filter(o => o !== "All").forEach((storeName) => {
            const sNorm = storeName.replace(/[.\-]/g, '-');
            const sKey = normalizeForMatch(storeName);
            const keys = Array.from(new Set([storeName, sNorm, sKey].filter(Boolean)));
            
            const storeObj = { ...(updatedTargets[storeName] || {}) };
            activeWeeks.forEach((wk) => {
              storeObj[wk] = parsed;
            });
            keys.forEach(k => {
              updatedTargets[k] = storeObj;
            });
          });
        } else {
          const storeObj = { ...(updatedTargets[store] || {}) };
          activeWeeks.forEach((wk) => {
            storeObj[wk] = parsed;
          });
          allKeysToUpdate.forEach(k => {
            updatedTargets[k] = storeObj;
          });
        }
        
        setWeeklyTargets(updatedTargets);
        localStorage.setItem("weeklyTargets", JSON.stringify(updatedTargets));

        // Pushing to DB asynchronously
        if (store === "All") {
          await saveStoreTargetToDb("All", updatedTargets, storeWeekRanges, month, CURRENT_YEAR, updatedEmpTargets);
          const promises = storeOptions.filter(o => o !== "All").map((storeName) => {
            return saveStoreTargetToDb(storeName, updatedTargets, storeWeekRanges, month, CURRENT_YEAR, updatedEmpTargets);
          });
          await Promise.all(promises);
        } else {
          await saveStoreTargetToDb(store, updatedTargets, storeWeekRanges, month, CURRENT_YEAR, updatedEmpTargets);
        }
      }

      // Re-fetch targets from DB to ensure local state and table render are 100% synchronized
      await fetchStoreTargets(month, CURRENT_YEAR);
    }

    window.__performanceCache = {};
    setAssignTargetModalOpen(false);
  };

  // Configure Week Dates Modal States
  const [configWeeksModalOpen, setConfigWeeksModalOpen] = useState(false);
  const [isEditingWeeks, setIsEditingWeeks] = useState(false);
  const [configStore, setConfigStore] = useState("All");
  const [configMonth, setConfigMonth] = useState(CURRENT_MONTH_LONG);
  const [configWeek1, setConfigWeek1] = useState(defaultAutoWeeks[1]);
  const [configWeek2, setConfigWeek2] = useState(defaultAutoWeeks[2]);
  const [configWeek3, setConfigWeek3] = useState(defaultAutoWeeks[3]);

  // Reset editing weeks state when the modal closes
  useEffect(() => {
    if (!configWeeksModalOpen) {
      setIsEditingWeeks(false);
      setConfigCalendarOpen(null);
    }
  }, [configWeeksModalOpen]);

  // Close calendar popups if inputs are locked
  useEffect(() => {
    if (!isEditingWeeks) {
      setConfigCalendarOpen(null);
    }
  }, [isEditingWeeks]);

  // Dappr Squad attribution modal states
  const [dapprModalOpen, setDapprModalOpen] = useState(false);
  // { [staffName]: { billWtd, valWtd, qtyWtd } }
  const [dapprAttribution, setDapprAttribution] = useState({});
  const [dapprInputs, setDapprInputs] = useState({});

  // Customization attribution modal states
  const [customizationModalOpen, setCustomizationModalOpen] = useState(false);
  const [customizationAttribution, setCustomizationAttribution] = useState({});
  const [storeCustomizationTotals, setStoreCustomizationTotals] = useState({});
  const [storeDapprTotals, setStoreDapprTotals] = useState({}); // { [normalizedStoreName]: { val, bills, qty } }
  const [customizationInputs, setCustomizationInputs] = useState({});

  const [configWeek4, setConfigWeek4] = useState(defaultAutoWeeks[4]);
  const [configCalendarOpen, setConfigCalendarOpen] = useState(null);
  const [configStartDays, setConfigStartDays] = useState({ 1: 1, 2: 8, 3: 15, 4: 22 });
  const [configEndDays, setConfigEndDays] = useState({ 1: 7, 2: 14, 3: 21, 4: 31 });

  // Reset selected report if unauthorized user tries to view Cluster DSR
  useEffect(() => {
    if (selectedReport === "Cluster DSR" && !isAdminOrSuperAdmin) {
      setSelectedReport("Revenue Vs Target");
    }
  }, [selectedReport, isAdminOrSuperAdmin]);

  // Sync config week dates when configStore changes
  useEffect(() => {
    if (configWeeksModalOpen) {
      if (configStore && configStore !== "All" && storeWeekRanges[configStore]) {
        const sr = storeWeekRanges[configStore];
        setConfigWeek1((sr[1] && sr[1] !== "Select Days") ? sr[1] : week1Dates);
        setConfigWeek2((sr[2] && sr[2] !== "Select Days") ? sr[2] : week2Dates);
        setConfigWeek3((sr[3] && sr[3] !== "Select Days") ? sr[3] : week3Dates);
        setConfigWeek4((sr[4] && sr[4] !== "Select Days") ? sr[4] : week4Dates);
      } else {
        setConfigWeek1(week1Dates);
        setConfigWeek2(week2Dates);
        setConfigWeek3(week3Dates);
        setConfigWeek4(week4Dates);
      }
    }
  }, [configStore, configWeeksModalOpen, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates]);

  // Parse picker days for the config weeks modal
  useEffect(() => {
    const p1 = parseWeekDays(configWeek1);
    const p2 = parseWeekDays(configWeek2);
    const p3 = parseWeekDays(configWeek3);
    const p4 = parseWeekDays(configWeek4);
    setConfigStartDays({ 1: p1.start, 2: p2.start, 3: p3.start, 4: p4.start });
    setConfigEndDays({ 1: p1.end, 2: p2.end, 3: p3.end, 4: p4.end });
  }, [configWeek1, configWeek2, configWeek3, configWeek4, configWeeksModalOpen]);

  const handleSaveConfigWeeks = async () => {
    let targetStore = configStore;
    if (isStoreAdmin && (targetStore === "All" || !targetStore)) {
      if (branches.length > 0) {
        targetStore = displayBranchName(branches[0].workingBranch);
      } else {
        alert("Please select a store (or All Stores).");
        return;
      }
    }

    if (!targetStore) {
      alert("Please select a store (or All Stores).");
      return;
    }
    
    // Instantly close modal so click is responsive with 0 lag
    setConfigWeeksModalOpen(false);
    setIsEditingWeeks(false);

    const rangeData = {
      1: configWeek1,
      2: configWeek2,
      3: configWeek3,
      4: configWeek4,
    };

    if (targetStore === "All") {
      setWeek1Dates(configWeek1);
      setWeek2Dates(configWeek2);
      setWeek3Dates(configWeek3);
      setWeek4Dates(configWeek4);
      localStorage.setItem("week1Dates", configWeek1);
      localStorage.setItem("week2Dates", configWeek2);
      localStorage.setItem("week3Dates", configWeek3);
      localStorage.setItem("week4Dates", configWeek4);
      
      setStoreWeekRanges((prev) => {
        const updated = { ...prev };
        updated["All"] = {
          ...prev["All"],
          ...rangeData,
          [configMonth]: rangeData
        };
        Object.keys(prev).forEach((k) => {
          updated[k] = {
            ...prev[k],
            ...rangeData,
            [configMonth]: rangeData
          };
        });
        branches.forEach((b) => {
          const sName = displayBranchName(b.workingBranch);
          const wName = b.workingBranch;
          const sNorm = sName.replace(/[.\-]/g, '-');
          const wNorm = wName.replace(/[.\-]/g, '-');
          const sMatch = normalizeForMatch(sName);
          const wMatch = normalizeForMatch(wName);

          [sName, wName, sNorm, wNorm, sMatch, wMatch].forEach(key => {
            if (key) {
              updated[key] = {
                ...prev[key],
                ...rangeData,
                [configMonth]: rangeData
              };
            }
          });
        });
        localStorage.setItem("storeWeekRanges", JSON.stringify(updated));
        return updated;
      });
      
      // Save global All default range to DB (backend updateMany updates all stores in DB)
      await saveStoreTargetToDb("All", weeklyTargets, {
        ...storeWeekRanges,
        "All": rangeData
      }, configMonth, CURRENT_YEAR);
    } else {
      const targetNorm = targetStore.replace(/[.\-]/g, '-');
      const targetNormMatch = normalizeForMatch(targetStore);
      setStoreWeekRanges((prev) => {
        const updated = {
          ...prev,
          [targetStore]: {
            ...prev[targetStore],
            ...rangeData,
            [configMonth]: rangeData
          },
          [targetNorm]: {
            ...prev[targetNorm],
            ...rangeData,
            [configMonth]: rangeData
          }
        };
        if (targetNormMatch) {
          updated[targetNormMatch] = {
            ...prev[targetNormMatch],
            ...rangeData,
            [configMonth]: rangeData
          };
        }
        localStorage.setItem("storeWeekRanges", JSON.stringify(updated));
        return updated;
      });
      
      // Save specific store range to DB
      await saveStoreTargetToDb(targetStore, weeklyTargets, {
        ...storeWeekRanges,
        [targetStore]: rangeData
      }, configMonth, CURRENT_YEAR);
    }
    
    window.__performanceCache = {};
    fetchStoreTargets(configMonth, CURRENT_YEAR);
  };

  useEffect(() => {
    if (assignTargetModalOpen && modalStore && activeWeeks && activeWeeks.length > 0) {
      const primaryWeek = activeWeeks[0];
      let customVal;

      const storeNorm = modalStore.replace(/[.\-]/g, '-');
      const normKey = normalizeForMatch(modalStore);
      
      if (targetAssignMode === "Staff" && modalStaff) {
        const empList = employeeTargets[modalStore] || employeeTargets[storeNorm] || employeeTargets[normKey] || [];
        const empObj = empList.find(e => getCanonicalStaffName(e.staffName) === getCanonicalStaffName(modalStaff) || e.staffName === modalStaff);
        customVal = empObj?.weeklyTargets?.[primaryWeek];
      } else {
        const tgtObj = weeklyTargets[modalStore] || weeklyTargets[storeNorm] || weeklyTargets[normKey] || getStoreWeeklyTargets(modalStore);
        customVal = tgtObj?.[primaryWeek];
      }

      if (customVal !== undefined && customVal !== null && customVal !== "") {
        setModalTarget(customVal.toString());
      } else {
        setModalTarget("");
      }
    }
  }, [assignTargetModalOpen, modalStore, activeWeeks, weeklyTargets, targetAssignMode, modalStaff, employeeTargets]);

  // Synchronize modal state dates when store or modal visibility changes
  // Also auto-select store for store_admin on modal open
  useEffect(() => {
    if (assignTargetModalOpen) {
      setActiveWeeks([1]);

      // Auto-select store for store_admin — they only have one store
      if (isStoreAdmin && branches.length === 1 && !modalStore) {
        const storeName = displayBranchName(branches[0].workingBranch);
        setModalStore(storeName);
        setTargetAssignMode("Staff"); // store_admin always assigns to staff
      }

      const effectiveStore = (isStoreAdmin && branches.length === 1)
        ? displayBranchName(branches[0].workingBranch)
        : modalStore;

      if (effectiveStore && effectiveStore !== "All" && storeWeekRanges[effectiveStore]) {
        const sr = storeWeekRanges[effectiveStore];
        setModalWeek1((sr[1] && sr[1] !== "Select Days") ? sr[1] : week1Dates);
        setModalWeek2((sr[2] && sr[2] !== "Select Days") ? sr[2] : week2Dates);
        setModalWeek3((sr[3] && sr[3] !== "Select Days") ? sr[3] : week3Dates);
        setModalWeek4((sr[4] && sr[4] !== "Select Days") ? sr[4] : week4Dates);
      } else {
        setModalWeek1(week1Dates);
        setModalWeek2(week2Dates);
        setModalWeek3(week3Dates);
        setModalWeek4(week4Dates);
      }
    }
  }, [modalStore, assignTargetModalOpen, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates, isStoreAdmin, branches]);

  const [calendarOpenForWeek, setCalendarOpenForWeek] = useState(null);
  const [weekStartDays, setWeekStartDays] = useState({ 1: 1, 2: 8, 3: 15, 4: 22 });
  const [weekEndDays, setWeekEndDays] = useState({ 1: 7, 2: 14, 3: 21, 4: 31 });

  useEffect(() => {
    const p1 = parseWeekDays(modalWeek1);
    const p2 = parseWeekDays(modalWeek2);
    const p3 = parseWeekDays(modalWeek3);
    const p4 = parseWeekDays(modalWeek4);
    setWeekStartDays({ 1: p1.start, 2: p2.start, 3: p3.start, 4: p4.start });
    setWeekEndDays({ 1: p1.end, 2: p2.end, 3: p3.end, 4: p4.end });
  }, [modalWeek1, modalWeek2, modalWeek3, modalWeek4, assignTargetModalOpen]);

  const handleWeekCardClick = (weekId, currentVal) => {
    setActiveWeek(weekId);
    setCalendarOpenForWeek(calendarOpenForWeek === weekId ? null : weekId);
    
    if (currentVal && currentVal !== "Select Days") {
      const { start: startDay, end: endDay } = parseWeekDays(currentVal);
      if (startDay !== null && endDay !== null) {
        setWeekStartDays(prev => ({ ...prev, [weekId]: startDay }));
        setWeekEndDays(prev => ({ ...prev, [weekId]: endDay }));
        return;
      }
    }
  };

  const handleScrollPickerChange = (weekId, startDay, endDay, setVal) => {
    let newStart = startDay;
    let newEnd = endDay;

    if (newStart !== null && newEnd !== null && newEnd < newStart) {
      newEnd = newStart;
    }

    setWeekStartDays(prev => ({ ...prev, [weekId]: newStart }));
    setWeekEndDays(prev => ({ ...prev, [weekId]: newEnd }));

    const monthAbbr = (modalMonth || "June").substring(0, 3);
    if (newStart !== null && newEnd !== null) {
      const formatted = `${String(newStart).padStart(2, "0")} - ${String(newEnd).padStart(2, "0")} ${monthAbbr}`;
      setVal(formatted);
    } else if (newStart !== null) {
      const formatted = `${String(newStart).padStart(2, "0")} - ${String(newStart).padStart(2, "0")} ${monthAbbr}`;
      setVal(formatted);
    } else {
      setVal("Select Days");
    }
  };

  const fetchStoreTargets = async (targetMonth = CURRENT_MONTH_LONG, targetYear = CURRENT_YEAR) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${baseUrl.baseUrl}api/store-targets?month=${targetMonth}&year=${targetYear}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const targetsMap = {};
        const rangesMap = {};
        const empTargetsMap = {};
        const autoWeeks = getAutoWeekDates(targetMonth, targetYear);
        let w1 = autoWeeks[1];
        let w2 = autoWeeks[2];
        let w3 = autoWeeks[3];
        let w4 = autoWeeks[4];
        
        // Sort data by updatedAt ascending so newer updated documents overwrite older ones for all aliases
        const sortedData = [...data].sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0));

        sortedData.forEach((doc) => {
          const store = doc.storeName;
          const storeNorm = store.replace(/[.\-]/g, '-');
          const normKey = normalizeForMatch(store);
          const dispName = displayBranchName(store);
          const matchingBranch = branches.find(b => displayBranchName(b.workingBranch) === store || b.workingBranch === store || normalizeForMatch(b.workingBranch) === normKey);
          const branchWorking = matchingBranch ? matchingBranch.workingBranch : null;
          const allStoreAliases = Array.from(new Set([store, dispName, branchWorking, storeNorm, normKey].filter(Boolean)));

          if (store === "All") {
            w1 = (doc.weekRanges?.[1] && doc.weekRanges?.[1] !== "Select Days") ? doc.weekRanges[1] : autoWeeks[1];
            w2 = (doc.weekRanges?.[2] && doc.weekRanges?.[2] !== "Select Days") ? doc.weekRanges[2] : autoWeeks[2];
            w3 = (doc.weekRanges?.[3] && doc.weekRanges?.[3] !== "Select Days") ? doc.weekRanges[3] : autoWeeks[3];
            w4 = (doc.weekRanges?.[4] && doc.weekRanges?.[4] !== "Select Days") ? doc.weekRanges[4] : autoWeeks[4];
          }
          
          const targetEntry = {
            1: doc.weeklyTargets?.[1] || 0,
            2: doc.weeklyTargets?.[2] || 0,
            3: doc.weeklyTargets?.[3] || 0,
            4: doc.weeklyTargets?.[4] || 0,
          };
          const rangeEntry = {
            1: (doc.weekRanges?.[1] && doc.weekRanges?.[1] !== "Select Days") ? doc.weekRanges[1] : autoWeeks[1],
            2: (doc.weekRanges?.[2] && doc.weekRanges?.[2] !== "Select Days") ? doc.weekRanges[2] : autoWeeks[2],
            3: (doc.weekRanges?.[3] && doc.weekRanges?.[3] !== "Select Days") ? doc.weekRanges[3] : autoWeeks[3],
            4: (doc.weekRanges?.[4] && doc.weekRanges?.[4] !== "Select Days") ? doc.weekRanges[4] : autoWeeks[4],
            [targetMonth]: {
              1: (doc.weekRanges?.[1] && doc.weekRanges?.[1] !== "Select Days") ? doc.weekRanges[1] : autoWeeks[1],
              2: (doc.weekRanges?.[2] && doc.weekRanges?.[2] !== "Select Days") ? doc.weekRanges[2] : autoWeeks[2],
              3: (doc.weekRanges?.[3] && doc.weekRanges?.[3] !== "Select Days") ? doc.weekRanges[3] : autoWeeks[3],
              4: (doc.weekRanges?.[4] && doc.weekRanges?.[4] !== "Select Days") ? doc.weekRanges[4] : autoWeeks[4],
            }
          };

          // Populate across all store name aliases
          allStoreAliases.forEach(aliasKey => {
            // Only set or override if doc has non-zero targets or targetsMap[aliasKey] doesn't exist yet
            const existing = targetsMap[aliasKey];
            const hasTargets = [1, 2, 3, 4].some(w => Number(targetEntry[w] || 0) > 0);
            if (!existing || hasTargets) {
              targetsMap[aliasKey] = targetEntry;
              rangesMap[aliasKey] = rangeEntry;
            }
            if (!empTargetsMap[aliasKey] || (doc.employeeTargets && doc.employeeTargets.length > 0)) {
              empTargetsMap[aliasKey] = doc.employeeTargets || [];
            }
          });
        });
        
        setWeeklyTargets(targetsMap);
        setStoreWeekRanges(rangesMap);
        setEmployeeTargets(empTargetsMap);
        setWeek1Dates(w1);
        setWeek2Dates(w2);
        setWeek3Dates(w3);
        setWeek4Dates(w4);
      }
    } catch (err) {
      console.error("Error fetching store targets from MongoDB:", err);
    }
  };

  const saveStoreTargetToDb = async (storeName, updatedTargets, updatedRanges, month = CURRENT_MONTH_LONG, year = CURRENT_YEAR, updatedEmpTargets = null) => {
    try {
      const token = localStorage.getItem("token");
      const targetObj = updatedTargets[storeName] || {};
      const rangeObj = updatedRanges[storeName] || {};
      const empTargetObj = updatedEmpTargets ? updatedEmpTargets[storeName] || [] : employeeTargets[storeName] || [];
      
      const payload = {
        storeName,
        month,
        year: Number(year),
        weekRanges: {
          1: rangeObj[1] || "Select Days",
          2: rangeObj[2] || "Select Days",
          3: rangeObj[3] || "Select Days",
          4: rangeObj[4] || "Select Days"
        },
        weeklyTargets: {
          1: targetObj[1] || 0,
          2: targetObj[2] || 0,
          3: targetObj[3] || 0,
          4: targetObj[4] || 0
        },
        employeeTargets: empTargetObj
      };
      
      await fetch(`${baseUrl.baseUrl}api/store-targets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Error saving store target to MongoDB:", err);
    }
  };

  const fetchDapprAttribution = async () => {
    const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
    try {
      const token = localStorage.getItem("token");
      const startMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
      const endMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
      const targetMonth = (activeTab === "Custom" && startMonth !== endMonth) ? "All" : endMonth;
      const startYear = activeTab === "Custom" ? getYearFromDateStr(appliedStartDate || customStartDate) : CURRENT_YEAR;
      const endYear = activeTab === "Custom" ? getYearFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_YEAR;
      const targetYear = (activeTab === "Custom" && startYear !== endYear) ? "All" : endYear;

      const isAllStores = !targetStore || targetStore === "All";

      let url;
      if (isAllStores) {
        url = `${baseUrl.baseUrl}api/dappr-attributions?storeName=All&month=${targetMonth}&year=${targetYear}`;
      } else {
        url = `${baseUrl.baseUrl}api/dappr-attributions?storeName=${encodeURIComponent(targetStore)}&month=${targetMonth}&year=${targetYear}`;
      }

      const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
      const json = await res.json();

      const mapped = {};           // { [staffName]: { billWtd, valWtd, qtyWtd, billFtd, valFtd, qtyFtd } }
      const dapprByStore = {};     // { [normalizedStoreName]: { val, bills, qty, valFtd, billsFtd, qtyFtd } }

      if (json.success && json.data) {
        const rawDocs = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
        const todayStr = getLocalDateString(new Date());
        const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;

        // Deduplicate documents by (store, month), picking the latest updated document per store and month
        const latestDocByStoreAndMonth = {};
        rawDocs.forEach(doc => {
          if (!doc || !doc.storeName || !doc.month) return;
          const key = `${normalizeForMatch(doc.storeName)}_${doc.month}`;
          const existing = latestDocByStoreAndMonth[key];
          const docTime = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
          const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;
          if (!existing || docTime > existingTime) {
            latestDocByStoreAndMonth[key] = doc;
          }
        });
        const docs = Object.values(latestDocByStoreAndMonth);

        docs.forEach(doc => {
          if (!doc || !doc.storeName) return;
          const storeKey = normalizeForMatch(doc.storeName);
          if (!dapprByStore[storeKey]) dapprByStore[storeKey] = { val: 0, bills: 0, qty: 0, valFtd: 0, billsFtd: 0, qtyFtd: 0 };

          const docDateStr = doc.updatedAt ? getLocalDateString(doc.updatedAt) : (doc.createdAt ? getLocalDateString(doc.createdAt) : "");
          const isTodayDoc = docDateStr === ftdTargetDate;

          (doc.attributions || []).forEach(attr => {
            if (!attr || !attr.staffName) return;
            const bv = Number(attr.billWtd) || 0;
            const vv = Number(attr.valWtd) || 0;
            const qv = Number(attr.qtyWtd) || 0;

            if (!mapped[attr.staffName]) {
              mapped[attr.staffName] = { billWtd: 0, valWtd: 0, qtyWtd: 0, billFtd: 0, valFtd: 0, qtyFtd: 0 };
            }

            mapped[attr.staffName].billWtd += bv;
            mapped[attr.staffName].valWtd += vv;
            mapped[attr.staffName].qtyWtd += qv;

            dapprByStore[storeKey].val += bv;
            dapprByStore[storeKey].bills += vv;
            dapprByStore[storeKey].qty += qv;

            if (isTodayDoc) {
              mapped[attr.staffName].billFtd += bv;
              mapped[attr.staffName].valFtd += vv;
              mapped[attr.staffName].qtyFtd += qv;

              dapprByStore[storeKey].valFtd += bv;
              dapprByStore[storeKey].billsFtd += vv;
              dapprByStore[storeKey].qtyFtd += qv;
            }
          });
        });
      }

      setDapprAttribution(mapped);
      setStoreDapprTotals(dapprByStore);
    } catch (err) {
      console.error("Error loading Dappr attributions:", err);
      setDapprAttribution({});
      setStoreDapprTotals({});
    }
  };

  const fetchCustomizationAttribution = async () => {
    const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
    try {
      const token = localStorage.getItem("token");
      const startMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
      const endMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedEndDate || customEndDate || customStartDate) : CURRENT_MONTH_LONG;
      const targetMonth = (activeTab === "Custom" && startMonth !== endMonth) ? "All" : endMonth;
      const startYear = activeTab === "Custom" ? getYearFromDateStr(appliedStartDate || customStartDate) : CURRENT_YEAR;
      const endYear = activeTab === "Custom" ? getYearFromDateStr(appliedEndDate || customEndDate || customStartDate) : CURRENT_YEAR;
      const targetYear = (activeTab === "Custom" && startYear !== endYear) ? "All" : endYear;
      const storeParam = (!targetStore || targetStore === "All") ? "All" : targetStore;

      const queryUrl = `${baseUrl.baseUrl}api/customization-attributions?storeName=${encodeURIComponent(storeParam)}&month=${targetMonth}&year=${targetYear}`;
      const res = await fetch(queryUrl, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const json = await res.json();
      const mappedStaff = {};
      const storeTotals = {};

      if (json.success && json.data) {
        const rawDocs = Array.isArray(json.data) ? json.data : [json.data];
        const todayStr = getLocalDateString(new Date());
        const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;

        // Deduplicate documents by (store, month), picking the latest updated document per store and month
        const latestDocByStoreAndMonth = {};
        rawDocs.forEach(doc => {
          if (!doc || !doc.storeName || !doc.month) return;
          const key = `${normalizeForMatch(doc.storeName)}_${doc.month}`;
          const existing = latestDocByStoreAndMonth[key];
          const docTime = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
          const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;
          if (!existing || docTime > existingTime) {
            latestDocByStoreAndMonth[key] = doc;
          }
        });
        const docs = Object.values(latestDocByStoreAndMonth);

        docs.forEach(doc => {
          if (!doc || !doc.storeName) return;
          const rawKey = normalizeForMatch(doc.storeName);
          const dispKey = normalizeForMatch(displayBranchName(doc.storeName));
          const edapKey = rawKey.replace(/edappally/g, "edapally");
          const dispEdapKey = dispKey.replace(/edappally/g, "edapally");
          const keysToAdd = Array.from(new Set([rawKey, dispKey, edapKey, dispEdapKey])).filter(Boolean);

          keysToAdd.forEach(k => {
            if (!storeTotals[k]) {
              storeTotals[k] = { val: 0, bills: 0, qty: 0, valFtd: 0, billsFtd: 0, qtyFtd: 0 };
            }
          });

          const docDateStr = doc.date || (doc.updatedAt ? getLocalDateString(doc.updatedAt) : (doc.createdAt ? getLocalDateString(doc.createdAt) : ""));
          const isTodayDoc = docDateStr === ftdTargetDate;

          let valAdd = Number(doc.totalValue) || 0;
          let billsAdd = Number(doc.totalBills) || 0;
          let qtyAdd = Number(doc.totalQuantity) || 0;

          if (doc.attributions && doc.attributions.length > 0) {
            doc.attributions.forEach(attr => {
              if (!attr || !attr.staffName) return;
              const bv = Number(attr.billWtd) || 0;
              const vv = Number(attr.valWtd) || 0;
              const qv = Number(attr.qtyWtd) || 0;

              if (!mappedStaff[attr.staffName]) {
                mappedStaff[attr.staffName] = { billWtd: 0, valWtd: 0, qtyWtd: 0, billFtd: 0, valFtd: 0, qtyFtd: 0 };
              }

              mappedStaff[attr.staffName].billWtd += bv;
              mappedStaff[attr.staffName].valWtd += vv;
              mappedStaff[attr.staffName].qtyWtd += qv;

              if (isTodayDoc) {
                mappedStaff[attr.staffName].billFtd += bv;
                mappedStaff[attr.staffName].valFtd += vv;
                mappedStaff[attr.staffName].qtyFtd += qv;
              }

              // If direct totalValue wasn't set, fallback to summing attributions
              if (!valAdd && !billsAdd && !qtyAdd) {
                valAdd += bv;
                billsAdd += vv;
                qtyAdd += qv;
              }
            });
          }

          keysToAdd.forEach(k => {
            storeTotals[k].val += valAdd;
            storeTotals[k].bills += billsAdd;
            storeTotals[k].qty += qtyAdd;

            if (isTodayDoc) {
              storeTotals[k].valFtd += valAdd;
              storeTotals[k].billsFtd += billsAdd;
              storeTotals[k].qtyFtd += qtyAdd;
            }
          });
        });
        console.log("[Customization] storeTotals keys:", Object.keys(storeTotals));
      }
      setCustomizationAttribution(mappedStaff);
      setStoreCustomizationTotals(storeTotals);
    } catch (err) {
      console.error("Error loading Customization attributions:", err);
      setCustomizationAttribution({});
      setStoreCustomizationTotals({});
    }
  };

  useEffect(() => {
    if (branches.length > 0) {
      fetchDapprAttribution();
      fetchCustomizationAttribution();
    }
  }, [isStoreAdmin, selectedStore, branches, activeTab, customStartDate, customEndDate, appliedStartDate, appliedEndDate]);

  // Dynamic branches state — declared at top of component

  // Auto-select the store for store_admin so they see staff view immediately
  useEffect(() => {
    if (isStoreAdmin && branches.length > 0) {
      const storeName = displayBranchName(branches[0].workingBranch);
      setSelectedStores([storeName]);
      setConfigStore(storeName);
    }
  }, [isStoreAdmin, branches]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [walkins, setWalkins] = useState([]);
  const [loadingWalkins, setLoadingWalkins] = useState(false);
  const [performanceData, setPerformanceData] = useState({ ftd: {}, period: {} });
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [salesData, setSalesData] = useState({ ftd: {}, period: {} });
  const [loadingSales, setLoadingSales] = useState(false);
  const isFetchingAny = loadingPerformance || loadingWalkins || loadingSales || loadingBranches;

  // Fetch branches dynamically
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/usercreate/getBranch`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          let visible = list.filter((b) => !isHiddenBranch(b?.workingBranch));

          // For store_admin: only show their assigned branch(es)
          if (isStoreAdmin && user?.branches?.length > 0) {
            const assignedIds = user.branches.map(b => String(b._id || b));
            visible = visible.filter(b => assignedIds.includes(String(b._id)));
          }
          // For cluster_admin: only show branches in their cluster
          else if (isClusterAdmin && user?.branches?.length > 0) {
            const assignedIds = user.branches.map(b => String(b._id || b));
            visible = visible.filter(b => assignedIds.includes(String(b._id)));
          }

          setBranches([...visible].sort(sortStoresGThenZ));
        }
      } catch (err) {
        console.error("Error fetching branches for DSR Report:", err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, [isStoreAdmin, isClusterAdmin]);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json.data || [];
          const clusterAdmins = list.filter(u => u.role === "cluster_admin");
          setClusters(clusterAdmins);
        }
      } catch (err) {
        console.error("Error fetching clusters for DSR Report:", err);
      }
    };
    fetchClusters();
  }, []);

  const [systemEmployees, setSystemEmployees] = useState([]);

  useEffect(() => {
    const fetchSystemEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        const [empRes, adminRes, greyRes] = await Promise.all([
          fetch(`${baseUrl.baseUrl}api/admin/accessible-employees`, { headers }).catch(() => null),
          fetch(`${baseUrl.baseUrl}api/admin/admin/list`, { headers }).catch(() => null),
          fetch(`${baseUrl.baseUrl}api/greythr/employees?limit=500`, { headers }).catch(() => null)
        ]);

        const list = [];
        if (empRes?.ok) {
          const json = await empRes.json();
          const empList = Array.isArray(json?.employees) ? json.employees : (Array.isArray(json?.data) ? json.data : []);
          empList.forEach(e => list.push(e));
        }
        if (adminRes?.ok) {
          const json = await adminRes.json();
          const adminList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
          adminList.forEach(a => {
            if (a && (a.EmpId || a.employeeId || a.empCode)) {
              list.push({
                ...a,
                EmpId: a.EmpId || a.employeeId || a.empCode,
                name: a.name || a.username
              });
            }
          });
        }
        if (greyRes?.ok) {
          const json = await greyRes.json();
          const greyList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
          greyList.forEach(g => {
            if (g && (g.empID || g.EmpId)) {
              list.push({
                ...g,
                EmpId: g.empID || g.EmpId,
                name: g.username || g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim(),
                workingBranch: g.workingBranch || g.branch || g.store,
                leftorg: Boolean(g.leftorg),
                leavingDate: g.leavingDate || null
              });
            }
          });
        }
        setSystemEmployees(list);
      } catch (err) {
        console.error("Error fetching system employees:", err);
      }
    };
    fetchSystemEmployees();
  }, []);

  const { systemEmpNameToCodeMap, systemEmpCodeToNameMap } = useMemo(() => {
    const nameToCodeMap = new Map();
    const codeToNameMap = new Map();

    systemEmployees.forEach(emp => {
      const code = emp.EmpId || emp.empID || emp.employeeId || emp.emp_code;
      const normCode = normalizeEmpCode(code);
      if (!normCode) return;

      const officialName = emp.name || emp.staffName || emp.username || "";
      if (officialName) {
        codeToNameMap.set(normCode, officialName);
      }

      [emp.username, emp.name, emp.staffName].filter(Boolean).forEach(rawName => {
        const canon = getCanonicalStaffName(rawName);
        const normKey = normalizeForMatch(rawName);
        
        nameToCodeMap.set(canon.toLowerCase(), normCode);
        nameToCodeMap.set(normKey, normCode);

        // Auto-handle spelling variants across systems (e.g. Q <-> K, E <-> EE, initials)
        const qToK = normKey.replace(/q/g, 'k');
        const kToQ = normKey.replace(/k/g, 'q');
        nameToCodeMap.set(qToK, normCode);
        nameToCodeMap.set(kToQ, normCode);

        const cleanKey = normKey.replace(/[^a-z]/g, '');
        if (cleanKey.length >= 3) {
          nameToCodeMap.set(cleanKey, normCode);
          nameToCodeMap.set(cleanKey.replace(/q/g, 'k'), normCode);
          nameToCodeMap.set(cleanKey.replace(/k/g, 'q'), normCode);
        }

        const tokens = rawName.trim().split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
          const initials = tokens.map(t => t[0]).join('').toLowerCase();
          if (initials.length >= 2 && !nameToCodeMap.has(initials)) {
            nameToCodeMap.set(initials, normCode);
          }
        }
      });
    });

    return { systemEmpNameToCodeMap: nameToCodeMap, systemEmpCodeToNameMap: codeToNameMap };
  }, [systemEmployees]);

  // Fetch targets dynamically when not editing targets in modals
  useEffect(() => {
    if (!assignTargetModalOpen && !configWeeksModalOpen) {
      if (activeTab === "Custom" && !customApplied) return;
      const targetMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedStartDate) : CURRENT_MONTH_LONG;
      const targetYear = activeTab === "Custom" ? getYearFromDateStr(appliedStartDate) : CURRENT_YEAR;
      fetchStoreTargets(targetMonth, targetYear);
    }
  }, [assignTargetModalOpen, configWeeksModalOpen, activeTab, appliedStartDate, customApplied]);

  // Fetch targets when assignTargetModalOpen is active and modalMonth changes
  useEffect(() => {
    if (assignTargetModalOpen && modalMonth) {
      fetchStoreTargets(modalMonth, CURRENT_YEAR);
    }
  }, [modalMonth, assignTargetModalOpen]);

  // Fetch targets when configWeeksModalOpen is active and configMonth changes
  useEffect(() => {
    if (configWeeksModalOpen && configMonth) {
      fetchStoreTargets(configMonth, CURRENT_YEAR);
    }
  }, [configMonth, configWeeksModalOpen]);

  // Fetch Dappr Squad manually-attributed values dynamically
  useEffect(() => {
    if (activeTab === "Custom" && !customApplied) return;
    fetchDapprAttribution();
  }, [activeTab, appliedStartDate, appliedEndDate, selectedStore, storeWeekRanges, dapprModalOpen, customApplied]);

  // Fetch walkins dynamically based on timeframe range
  useEffect(() => {
    if (activeTab === "Custom" && !customApplied) {
      setLoadingWalkins(false);
      return;
    }
    const fetchWalkins = async () => {
      setLoadingWalkins(true);
      try {
        const token = localStorage.getItem("token");
        const todayStr = getLocalDateString(new Date());
        
        let periodStart = todayStr;
        let periodEnd = todayStr;
        if (activeTab === "WTD") {
          // Use the actual WTD range instead of MTD
          let minStart = getStoreWTDDateRange("All").start;
          branches.forEach((b) => {
            const storeName = displayBranchName(b.workingBranch);
            const range = getStoreWTDDateRange(storeName);
            if (range.start < minStart) {
              minStart = range.start;
            }
          });
          periodStart = minStart;
          periodEnd = todayStr;
        } else if (activeTab === "MTD") {
          const today = new Date();
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (activeTab === "Custom") {
          periodStart = appliedStartDate || todayStr;
          periodEnd = appliedEndDate || todayStr;
        }

        const fetchStart = periodStart;
        const fetchEnd = periodEnd;

        const res = await fetch(`${baseUrl.baseUrl}api/walkin/list?startDate=${fetchStart}&endDate=${fetchEnd}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          setWalkins(list);
        }
      } catch (err) {
        console.error("Error fetching walkins for DSR:", err);
      } finally {
        setLoadingWalkins(false);
      }
    };

    fetchWalkins();
  }, [activeTab, appliedStartDate, appliedEndDate, customApplied, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates, branches]);

  // Fetch staff performance dynamically based on timeframe range
  useEffect(() => {
    if (activeTab === "Custom" && !customApplied) {
      setLoadingPerformance(false);
      return;
    }
    const fetchPerformance = async () => {
      setLoadingPerformance(true);
      try {
        const todayStr = getLocalDateString(new Date());
        
        let periodStart = todayStr;
        let periodEnd = todayStr;
        if (activeTab === "WTD") {
          // Fallback global range used only for default values
          const wtdRange = getStoreWTDDateRange("All");
          periodStart = wtdRange.start;
          periodEnd = wtdRange.end;
        } else if (activeTab === "MTD") {
          const today = new Date();
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (activeTab === "Custom") {
          periodStart = appliedStartDate || todayStr;
          periodEnd = appliedEndDate || todayStr;
        }

        const locationIds = ["1", "3", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "23", "25"];

        const getStoreNameFromLocId = (locId) => {
          const foundBranch = branches.find(b => getBranchLocationId(b.workingBranch) === locId);
          if (foundBranch) return displayBranchName(foundBranch.workingBranch);
          const branchKey = Object.keys(BRANCH_LOCATION_MAPPING).find(key => BRANCH_LOCATION_MAPPING[key] === locId);
          if (!branchKey) return "All";
          return displayBranchName(branchKey);
        };

        const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;

        const ftdResults = await Promise.all(locationIds.map(async (locId) => {
          const data = await getPerformanceCached(locId, ftdTargetDate, ftdTargetDate);
          return { locId, data };
        }));
        const ftdMap = {};
        ftdResults.forEach(r => {
          ftdMap[r.locId] = r.data;
        });

        // Parallel fetch for Period (WTD, MTD, Custom) all locations simultaneously
        const periodResults = await Promise.all(locationIds.map(async (locId) => {
          let storePeriodStart = periodStart;
          let storePeriodEnd = periodEnd;
          if (activeTab === "WTD") {
            const storeName = getStoreNameFromLocId(locId);
            const wtdRange = getStoreWTDDateRange(storeName);
            storePeriodStart = wtdRange.start;
            storePeriodEnd = wtdRange.end;
          }

          const data = await getPerformanceCached(locId, storePeriodStart, storePeriodEnd);
          return { locId, data };
        }));

        const periodMap = {};
        periodResults.forEach(r => {
          periodMap[r.locId] = r.data;
        });

        setPerformanceData({ ftd: ftdMap, period: periodMap });
      } catch (err) {
        console.error("Error fetching performance reports:", err);
      } finally {
        setLoadingPerformance(false);
      }
    };

    fetchPerformance();
  }, [activeTab, appliedStartDate, appliedEndDate, customApplied, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates]);

  // Fetch Shoe Sales Bookings & Returns dynamically based on timeframe range
  useEffect(() => {
    if (activeTab === "Custom" && !customApplied) {
      setLoadingSales(false);
      return;
    }
    const fetchSales = async () => {
      setLoadingSales(true);
      try {
        const todayStr = getLocalDateString(new Date());
        
        let periodStart = todayStr;
        let periodEnd = todayStr;
        if (activeTab === "WTD") {
          let minStart = getStoreWTDDateRange("All").start;
          branches.forEach((b) => {
            const storeName = displayBranchName(b.workingBranch);
            const range = getStoreWTDDateRange(storeName);
            if (range.start < minStart) {
              minStart = range.start;
            }
          });
          periodStart = minStart;
          periodEnd = todayStr;
        } else if (activeTab === "MTD") {
          const today = new Date();
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (activeTab === "Custom") {
          periodStart = appliedStartDate || todayStr;
          periodEnd = appliedEndDate || todayStr;
        }

        const activeList = branches.length > 0
          ? branches.map((b) => ({ name: displayBranchName(b.workingBranch), workingBranch: b.workingBranch, locCode: b.locCode }))
          : [
              { name: "G Thrissur", workingBranch: "G.Thrissur", locCode: "704" },
              { name: "SG Edappally", workingBranch: "G-Edappally", locCode: "702" },
              { name: "Z Edappally", workingBranch: "Z-Edapally1", locCode: "144" },
              { name: "G Edappally", workingBranch: "G-Edappally", locCode: "702" },
              { name: "Z Edappal", workingBranch: "Z- Edappal", locCode: "100" },
              { name: "Z Perinthalmanna", workingBranch: "Z.Perinthalmanna", locCode: "133" },
              { name: "Z Kottakkal", workingBranch: "Z.Kottakkal", locCode: "122" },
              { name: "G Kottayam", workingBranch: "G.Kottayam", locCode: "701" },
              { name: "G Perumbavoor", workingBranch: "G.Perumbavoor", locCode: "703" }
            ];

        // New summary API: single call per date range returns all stores in one shot
        const fetchSummary = async (fromDate, toDate) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            let res;
            try {
              res = await fetch(
                `${baseUrl.baseUrl}api/brynex/shoe-sales/summary?fromDate=${fromDate}&toDate=${toDate}`,
                { signal: controller.signal }
              );
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              console.error("fetchSummary HTTP error:", res.status);
              return {};
            }
            const json = await res.json();
            const stores = Array.isArray(json.stores) ? json.stores : [];
            console.log(`fetchSummary succeeded for ${fromDate} to ${toDate}, stores count:`, stores.length);
            const map = {};
            stores.forEach(s => {
              const lc = String(s.locCode || "");
              const shoe  = s.shoe  || {};
              const shirt = s.shirt || {};
              const mixed = s.mixed || {};
              const total = s.total || {};
              const entry = {
                value:      total.value  || 0,
                qty:        total.qty    || 0,
                bills:      total.bills  || 0,
                shoeQty:   (shoe.qty   || 0) + (mixed.qty   || 0),
                shoeValue: (shoe.value || 0) + (mixed.value || 0),
                shoeBills: (shoe.bills || 0) + (mixed.bills || 0),
                shirtQty:   shirt.qty   || 0,
                shirtValue: shirt.value || 0,
                shirtBills: shirt.bills || 0,
                byStaff: {}
              };
              // Index by locCode
              if (lc) map[lc] = entry;
              // Also index by normalised store name from the API so name-based lookup works
              if (s.storeName) {
                const nameKey = normalizeForMatch(s.storeName);
                if (nameKey && !map[nameKey]) map[nameKey] = entry;
              }
            });
            return map;
          } catch (err) {
            if (err.name !== "AbortError") {
              console.error("Error fetching shoe-sales summary:", err);
            }
            return {};
          }
        };

        const fetchSalespersons = async (fromDate, toDate) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            let res;
            try {
              res = await fetch(
                `${baseUrl.baseUrl}api/brynex/shoe-sales/by-salesperson?fromDate=${fromDate}&toDate=${toDate}`,
                { signal: controller.signal }
              );
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              console.error("fetchSalespersons HTTP error:", res.status);
              return [];
            }
            const json = await res.json();
            const list = Array.isArray(json.salespersons) ? json.salespersons : [];
            console.log(`fetchSalespersons succeeded for ${fromDate} to ${toDate}, count:`, list.length);
            return list;
          } catch (err) {
            if (err.name !== "AbortError") {
              console.error(`Error fetching shoe-sales by-salesperson for ${fromDate} to ${toDate}:`, err);
            }
            return [];
          }
        };

        const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;

        const [ftdMap, periodMap, ftdSalespersons, periodSalespersons] = await Promise.all([
          fetchSummary(ftdTargetDate, ftdTargetDate),
          fetchSummary(periodStart, periodEnd),
          fetchSalespersons(ftdTargetDate, ftdTargetDate),
          fetchSalespersons(periodStart, periodEnd)
        ]);

        const mergeSalespersons = (map, salespersonsList) => {
          salespersonsList.forEach(sp => {
            const staffName = sp.salesperson || "Unassigned";
            const staffKey = normalizeForMatch(staffName);
            const rawEmpCode = sp.empId || sp.employeeId || "";
            const empCode = normalizeEmpCode(rawEmpCode) || systemEmpNameToCodeMap.get(getCanonicalStaffName(staffName).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(staffName)) || "";
            const storesList = Array.isArray(sp.stores) ? sp.stores : [];
            
            storesList.forEach(st => {
              const lc = String(st.locCode || "");
              const total = st.total || {};
              const entryVal = {
                value: total.value || 0,
                qty: total.qty || 0,
                bills: total.bills || 0,
                empCode: empCode,
                staffName: staffName
              };
              
              const applyToEntry = (entry) => {
                if (!entry.byStaff) entry.byStaff = {};
                const canon = getCanonicalStaffName(staffName);
                entry.byStaff[canon] = entryVal;
                entry.byStaff[staffName] = entryVal;
              };

              if (lc && map[lc]) {
                applyToEntry(map[lc]);
              }
              if (st.storeName) {
                const nameKey = normalizeForMatch(st.storeName);
                if (nameKey && map[nameKey]) {
                  applyToEntry(map[nameKey]);
                }
              }
            });
          });
        };

        mergeSalespersons(ftdMap, ftdSalespersons);
        mergeSalespersons(periodMap, periodSalespersons);

        // Also index by normalised branch name for lookup flexibility
        const indexByName = (map) => {
          const out = { ...map };
          activeList.forEach(item => {
            const lc = item.locCode || getBranchLocCode(item.workingBranch, branches);
            if (lc && map[lc]) {
              const key = normalizeForMatch(item.workingBranch);
              if (key && !out[key]) out[key] = map[lc]; // only add if not already present
            }
          });
          return out;
        };

        setSalesData({ ftd: indexByName(ftdMap), period: indexByName(periodMap) });
      } catch (err) {
        console.error("Error in fetchSales:", err);
      } finally {
        setLoadingSales(false);
      }
    };

    fetchSales();
  }, [activeTab, appliedStartDate, appliedEndDate, customApplied, branches, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates]);


  useEffect(() => {
    localStorage.setItem("week1Dates", week1Dates);
  }, [week1Dates]);

  useEffect(() => {
    localStorage.setItem("week2Dates", week2Dates);
  }, [week2Dates]);

  useEffect(() => {
    localStorage.setItem("week3Dates", week3Dates);
  }, [week3Dates]);

  useEffect(() => {
    localStorage.setItem("week4Dates", week4Dates);
  }, [week4Dates]);

  const getMTDDateRangeString = () => {
    const today = new Date();
    const monthName = today.toLocaleString("en-US", { month: "long" });
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    return `${monthName} 01-${day}, ${year}`;
  };

  const getDaysCountInMonth = (monthName = CURRENT_MONTH_LONG) => {
    const months = {
      January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
      July: 31, August: 31, September: 30, October: 31, November: 30, December: 31
    };
    return months[monthName] || 30;
  };

  const getStoreWTDDateRange = (storeName = "All") => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    
    const activeWeekId = getCurrentWeekId(storeName);
    
    let w1 = week1Dates, w2 = week2Dates, w3 = week3Dates, w4 = week4Dates;
    // For all stores (including "All"), try to read the configured week ranges
    const sr = getStoreWeekRange(storeName);
    if (sr) {
      if (sr[1]) w1 = sr[1];
      if (sr[2]) w2 = sr[2];
      if (sr[3]) w3 = sr[3];
      if (sr[4]) w4 = sr[4];
    }

    let startDayNum = 1;
    const weekVal = activeWeekId === 1 ? w1 
                  : activeWeekId === 2 ? w2 
                  : activeWeekId === 3 ? w3 
                  : w4;
                  
    const { start: parsedStart } = parseWeekDays(weekVal);
    if (parsedStart !== null) {
      startDayNum = parsedStart;
    } else {
      if (activeWeekId === 1) startDayNum = 1;
      else if (activeWeekId === 2) startDayNum = 8;
      else if (activeWeekId === 3) startDayNum = 15;
      else startDayNum = 22;
    }
    
    const startDate = new Date(today.getFullYear(), today.getMonth(), startDayNum);
    
    return {
      start: getLocalDateString(startDate),
      end: todayStr
    };
  };

  const getWTDDateRangeString = () => {
    const today = new Date();
    const wtdRange = getStoreWTDDateRange(selectedStore);
    const startDate = new Date(wtdRange.start);
    
    const startMonth = startDate.toLocaleString("en-US", { month: "long" });
    const startDay = String(startDate.getDate()).padStart(2, "0");
    
    const endMonth = today.toLocaleString("en-US", { month: "long" });
    const endDay = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  // Format values to match Indian standard layout (e.g. 22,20,000)
  const formatIndianNumber = (num) => {
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const str = absNum.toString();
    let lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    if (otherNumbers !== "") {
      lastThree = "," + lastThree;
    }
    const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return (isNegative ? "-" : "") + res;
  };

  const renderCellVal = (val, isPercent = false) => {
    const rawVal = String(val);
    const numVal = parseFloat(rawVal.replace(/,/g, ""));
    const isZero = rawVal === "0" || rawVal === "0.0" || rawVal === "0%" || rawVal === "";
    const isNegative = !isNaN(numVal) && numVal < 0;
    const colorClass = isNegative ? "text-[#e05a47] font-bold" : isZero ? "text-[#e05a47] font-bold" : "";
    return (
      <span className={colorClass}>
        {val}{isPercent && "%"}
      </span>
    );
  };

  // Generate dynamic DSR data based on fetched branches (No mock fallbacks!)
  const dsrData = useMemo(() => {
    let customFactor = 1.0;
    if (activeTab === "Custom") {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      customFactor = isNaN(diffDays) ? 1.0 : diffDays / 30.0;
    }
    if (isStoreAdmin && branches.length === 1) {
      const item = branches[0];
      const name = displayBranchName(item.workingBranch);
      const locId = getBranchLocationId(item.workingBranch);
      const locCode = item.locCode || getBranchLocCode(item.workingBranch, branches);
      const storeKeyVal = normalizeForMatch(item.workingBranch);

      const defaultTarget = 0;
      const storeTarget = getStoreTarget(name, defaultTarget, activeTab, customFactor);

      const locPeriodList = performanceData.period[locId] || [];

      // Dappr Squad data is now entered manually via dapprAttribution — no longer auto-merged here
      const mergedPeriodList = [...locPeriodList];
      let storeTotalRental = mergedPeriodList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
      if (funnelView === "Consolidated") {
        storeTotalRental += Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
      }

      let storeTotalSales = 0;
      if (funnelView === "Consolidated") {
        const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { value: 0 };
        storeTotalSales = salesPeriodItem.value || 0;
      }

      const storeTotalAchieved = storeTotalRental + storeTotalSales;
      const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { byStaff: {} };

      const canonicalizeName = (rawName) => {
        if (!rawName) return "";
        const strName = String(rawName);
        if (strName.toLowerCase() === "unassigned") return "Unassigned";
        const canon = getCanonicalStaffName(strName);
        const normCanon = normalizeForMatch(canon);
        const match = mergedPeriodList.find(n => n && (normalizeForMatch(n.bookingBy) === normCanon || normalizeForMatch(getCanonicalStaffName(n.bookingBy)) === normCanon));
        return match ? match.bookingBy : canon;
      };

      const salesStaffNames = funnelView === "Consolidated"
        ? Object.keys(salesPeriodItem.byStaff || {}).map(canonicalizeName).filter(Boolean)
        : [];

      const sysEmpNames = systemEmployees
        .filter(e => {
          const b = e?.workingBranch || e?.branch || e?.store;
          return b && (normalizeForMatch(b) === storeKeyVal || displayBranchName(b) === name || getBranchLocCode(b, branches) === locCode);
        })
        .map(e => String(e.name || e.username || "").trim())
        .filter(Boolean);

      const rawStaffNames = [
        ...sysEmpNames,
        ...mergedPeriodList.map(x => x && x.bookingBy),
        ...salesStaffNames,
        ...(funnelView === "Consolidated" ? Object.keys(dapprAttribution) : [])
      ].filter(name => typeof name === "string" && name.trim() !== "" && name.trim().toLowerCase() !== "none");
      const sortedStaffNames = Array.from(new Set(rawStaffNames)).sort((a, b) => (b || "").length - (a || "").length);

      const staffEntries = [];
      sortedStaffNames.forEach(rawName => {
        const canonName = getCanonicalStaffName(rawName);
        const normReal = normalizeForMatch(canonName);
        const empCode = systemEmpNameToCodeMap.get(canonName.toLowerCase()) || systemEmpNameToCodeMap.get(normReal);

        let entry = null;
        if (empCode) {
          entry = staffEntries.find(e => e.empCodes.includes(empCode));
        }
        if (!entry) {
          entry = staffEntries.find(e => isStaffNameMatch(e.displayName, rawName) || e.rawNames.some(rn => isStaffNameMatch(rn, rawName)));
        }

        if (entry) {
          if (empCode && !entry.empCodes.includes(empCode)) entry.empCodes.push(empCode);
          if (!entry.rawNames.includes(rawName)) entry.rawNames.push(rawName);
        } else {
          const officialName = (empCode && systemEmpCodeToNameMap?.get(empCode)) ? systemEmpCodeToNameMap.get(empCode) : canonName;
          staffEntries.push({
            displayName: officialName,
            empCodes: empCode ? [empCode] : [],
            rawNames: [rawName]
          });
        }
      });

      return staffEntries.map((entry, index) => {
        const sl = String(index + 1).padStart(2, "0");
        const fullName = entry.displayName;

        let rentalVal = mergedPeriodList.filter(x => {
          if (!x) return false;
          const xCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(x.bookingBy));
          if (xCode && entry.empCodes.includes(xCode)) return true;
          return entry.rawNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(fullName, x.bookingBy);
        }).reduce((sum, x) => sum + (x.totalValue || 0), 0);

        if (funnelView === "Consolidated") {
          const dapprKey = Object.keys(dapprAttribution).find(k => {
            const kCode = systemEmpNameToCodeMap.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(k));
            if (kCode && entry.empCodes.includes(kCode)) return true;
            return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(fullName, k);
          });
          if (dapprKey) {
            rentalVal += Number(dapprAttribution[dapprKey]?.billWtd) || 0;
          }
        }

        let salesVal = 0;
        if (funnelView === "Consolidated") {
          const getSalesDataForStaff = (salesItem) => {
            if (!salesItem || !salesItem.byStaff) return {};

            const foundKey = Object.keys(salesItem.byStaff).find(k => {
              const item = salesItem.byStaff[k];
              const kCode = item?.empCode || normalizeEmpCode(k) || systemEmpNameToCodeMap.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(k));
              if (kCode && entry.empCodes.includes(kCode)) return true;
              return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(fullName, k);
            });
            return foundKey ? salesItem.byStaff[foundKey] : {};
          };
          salesVal = getSalesDataForStaff(salesPeriodItem).value || 0;
        }

        const achieved = rentalVal + salesVal;
        
        let target = getStaffTarget(name, fullName, activeTab);
        if (target === null) {
          target = 0;
        }
        
        const balance = target - achieved;
        const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;

        return { sl, name: fullName, target, achieved, balance, pct, isStaff: true };
      }).sort((a, b) => b.achieved - a.achieved);
    }

    const list = branches.map((b, index) => {
      const sl = String(index + 1).padStart(2, "0");
      const name = displayBranchName(b.workingBranch);
      const locId = getBranchLocationId(b.workingBranch);
      const storeKeyVal = locationKey(b.workingBranch);

      // Skip Dappr Squad branch row (data is merged into store rows)
      if (locId === "25") return null;

      const defaultTarget = 0;
      const target = getStoreTarget(name, defaultTarget, activeTab, customFactor);

      // Build achieved using the same formula as funnelRows so per-store numbers match.
      const locPeriodList = performanceData.period[locId] || [];
      const dapprPeriodList = funnelView === "Consolidated" ? (performanceData.period["25"] || []) : [];
      const dapprPeriodForStore = funnelView === "Consolidated" ? getDapprSquadDataForStore(locId, dapprPeriodList) : [];

      const isGMGRoad = locId === "23";
      const unmappedDapprPeriodList = (isGMGRoad && funnelView === "Consolidated")
        ? dapprPeriodList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];

      const mergedPeriodList = [...locPeriodList, ...dapprPeriodForStore, ...unmappedDapprPeriodList];
      let achieved = mergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      if (funnelView === "Consolidated") {
        const locCode = b.locCode || getBranchLocCode(b.workingBranch, branches);
        // Add shoe/shirt sales (same lookup as funnelRows)
        const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { value: 0 };
        achieved += salesPeriodItem.value || 0;
      }

      const balance = target - achieved;
      const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
      return { sl, name, target, achieved, balance, pct };
    }).filter(Boolean);
    return list;
  }, [branches, weeklyTargets, activeTab, customStartDate, customEndDate, performanceData, funnelView, salesData, dapprAttribution, customizationAttribution, storeCustomizationTotals]);

  // Generate dynamic Sales Funnel data based on fetched branches (with mock fallback)
  const funnelRows = useMemo(() => {

    
    // Calculate active period start and end date
    let periodStart = todayStr;
    let periodEnd = todayStr;
    if (activeTab === "WTD") {
      const wtdRange = getStoreWTDDateRange("All");
      periodStart = wtdRange.start;
      periodEnd = wtdRange.end;
    } else if (activeTab === "MTD") {
      const today = new Date();
      periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
      periodEnd = todayStr;
    } else if (activeTab === "Custom") {
      periodStart = customStartDate || todayStr;
      periodEnd = customEndDate || todayStr;
    }

    const getWalkinDateString = (w) => {
      if (w.createdAt) {
        return getLocalDateString(w.createdAt);
      }
      if (!w.date || w.date === '-') return '';
      return w.date.split(' ')[0];
    };

    const isLoss = (w) => {
      const s = String(w.status || '').toLowerCase();
      const rentalS = String(w.rentalStatus || '').toLowerCase();
      const shoeS = String(w.shoeStatus || '').toLowerCase();
      return s === 'loss' || s === 'revisit loss' || s === 'lost' ||
             rentalS === 'loss' || rentalS === 'revisit loss' || rentalS === 'lost' ||
             shoeS === 'loss' || shoeS === 'revisit loss' || shoeS === 'lost';
    };



    const isFtdEmpty = Object.keys(performanceData.ftd).length === 0;
    const isPeriodEmpty = Object.keys(performanceData.period).length === 0;
    const useMock = isFtdEmpty && isPeriodEmpty;

    // Helper to calculate derived metrics for a row
    // valFtd/valWtd = total_Number_Of_Bill (bill count)
    // billFtd/billWtd = totalValue (sale value / money)
    // qtyFtd/qtyWtd = totalQuantity
    const withDerivedMetrics = (row) => {
      // ABV = Total Value / Total Bills
      const abvFtd = row.billFtd > 0 ? Math.round(row.valFtd / row.billFtd) : 0;
      const abvWtd = row.billWtd > 0 ? Math.round(row.valWtd / row.billWtd) : 0;
      // ABS = Total Quantity / Total Bills
      const absFtd = row.billFtd > 0 ? parseFloat((row.qtyFtd / row.billFtd).toFixed(1)) : 0;
      const absWtd = row.billWtd > 0 ? parseFloat((row.qtyWtd / row.billWtd).toFixed(1)) : 0;
      // Conversion = (Total Bills / Walk-ins) * 100
      const convFtd = row.walkFtd > 0 ? Math.round((row.billFtd / row.walkFtd) * 100) : 0;
      const convWtd = row.walkWtd > 0 ? Math.round((row.billWtd / row.walkWtd) * 100) : 0;
      // ARP = Total Value / Total Quantity
      const arpFtd = row.qtyFtd > 0 ? Math.round(row.valFtd / row.qtyFtd) : 0;
      const arpWtd = row.qtyWtd > 0 ? Math.round(row.valWtd / row.qtyWtd) : 0;
      
      return {
        ...row,
        abvFtd,
        abvWtd,
        absFtd,
        absWtd,
        convFtd,
        convWtd,
        arpFtd,
        arpWtd
      };
    };

    const buildStoreStaffRows = ({
      storeName,
      storeKeyVal,
      locId,
      selectedBranch,
      locFtdList = [],
      locPeriodList = [],
      salesFtdItem = { byStaff: {} },
      salesPeriodItem = { byStaff: {} }
    }) => {
      const staffMap = new Map();

      const getOrCreateStaffEntry = (empCode, rawName) => {
        const normCode = normalizeEmpCode(empCode);
        const rentalName = rawName ? String(rawName).trim() : "";

        let entry = null;

        if (normCode) {
          for (const e of staffMap.values()) {
            if (e.empCodes.includes(normCode)) {
              entry = e;
              break;
            }
          }
        }

        if (!entry && (rentalName || normCode)) {
          for (const e of staffMap.values()) {
            if (
              rentalName && (isStaffNameMatch(e.displayName, rentalName) || e.rentalNames.some(rn => isStaffNameMatch(rn, rentalName)))
            ) {
              entry = e;
              break;
            }
          }
        }

        if (!entry) {
          entry = {
            empCodes: normCode ? [normCode] : [],
            displayName: rentalName || (normCode ? `Emp ${normCode}` : "Unassigned"),
            rentalNames: rentalName ? [rentalName] : [],
            siteNames: []
          };
          const key = normCode || (rentalName || "unassigned").toLowerCase();
          staffMap.set(key, entry);
        } else {
          if (normCode && !entry.empCodes.includes(normCode)) {
            entry.empCodes.push(normCode);
          }
          if (rentalName && !entry.rentalNames.includes(rentalName)) {
            entry.rentalNames.push(rentalName);
          }
          if (rentalName && rentalName.length > entry.displayName.length) {
            entry.displayName = rentalName;
          }
        }

        return entry;
      };

      const locCode = selectedBranch?.locCode || getBranchLocCode(selectedBranch?.workingBranch, branches);
      
      // 0. Seed all staff members belonging to this store (Date-Aware for Resigned Employees)
      systemEmployees.forEach(e => {
        const b = e?.workingBranch || e?.branch || e?.store;
        if (b && (normalizeForMatch(b) === storeKeyVal || displayBranchName(b) === storeName || getBranchLocCode(b, branches) === locCode)) {
           // If employee resigned, only include them if they were still working during the selected report period
           if (e.leftorg) {
             if (e.leavingDate) {
               const lDate = String(e.leavingDate).split('T')[0];
               if (lDate < periodStart) {
                 return; // Left before this report period started -> Skip
               }
             } else {
               return; // Left without leaving date -> Skip
             }
           }

           const rawName = e.name || e.username || (e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : '');
           const empCode = e.EmpId || e.employeeId || e.empCode;
           if (rawName || empCode) {
             getOrCreateStaffEntry(empCode, rawName);
           }
        }
      });

      // 1. Process Rental POS items & Shoe Sales to associate aliases (without spawning new rows)
      [...locFtdList, ...locPeriodList].forEach(x => {
        if (x && (x.bookingBy || x.empCode)) {
          const rentalCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(x.bookingBy)) || "";
          if (rentalCode) {
            for (const e of staffMap.values()) {
              if (e.empCodes.includes(rentalCode)) {
                if (x.bookingBy && !e.rentalNames.includes(x.bookingBy)) {
                  e.rentalNames.push(x.bookingBy);
                }
                break;
              }
            }
          }
        }
      });

      // 2. Process Walk-ins for this store (associate with existing greytHR staff only)
      const storeWalkins = walkins.filter(w => {
        return String(w.storeId || '') === String(selectedBranch?._id || '') ||
               locationKey(w.store) === storeKeyVal ||
               normalizeForMatch(w.store) === normalizeForMatch(storeName);
      });

      storeWalkins.forEach(w => {
        const wCodes = extractWalkinEmpCodes(w, systemEmpNameToCodeMap);
        const wStaff = w.staff || w.staffName || (typeof w.createdBy === 'string' ? w.createdBy : w.createdBy?.name) || w.managerName || '';

        let entry = null;
        if (wCodes.length > 0) {
          for (const e of staffMap.values()) {
            if (e.empCodes.some(c => wCodes.includes(c))) {
              entry = e;
              break;
            }
          }
        }

        if (!entry && wStaff) {
          for (const e of staffMap.values()) {
            if (
              isStaffNameMatch(e.displayName, wStaff) ||
              e.rentalNames.some(rn => isStaffNameMatch(rn, wStaff)) ||
              e.siteNames.some(sn => isStaffNameMatch(sn, wStaff))
            ) {
              entry = e;
              break;
            }
          }
        }

        if (entry) {
          wCodes.forEach(c => {
            if (!entry.empCodes.includes(c)) entry.empCodes.push(c);
          });
          if (wStaff && !entry.siteNames.includes(wStaff)) {
            entry.siteNames.push(wStaff);
          }
        }
      });

      // Calculate Date Ranges for Walk-ins
      let storePeriodStart = todayStr;
      let storePeriodEnd = todayStr;
      if (activeTab === "WTD") {
        const wtdRange = getStoreWTDDateRange(storeName);
        storePeriodStart = wtdRange.start;
        storePeriodEnd = wtdRange.end;
      } else if (activeTab === "MTD") {
        const today = new Date();
        storePeriodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
        storePeriodEnd = todayStr;
      } else if (activeTab === "Custom") {
        storePeriodStart = customStartDate || todayStr;
        storePeriodEnd = customEndDate || todayStr;
      }

      // 4. Map staff entries to output row objects
      return Array.from(staffMap.values()).map(entry => {
        const staffFtdList = locFtdList.filter(x => {
          if (!x) return false;
          const xCode = normalizeEmpCode(x.empCode || x.empID || x.EmpId || x.employeeId);
          if (xCode && entry.empCodes.includes(xCode)) return true;
          return entry.rentalNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(entry.displayName, x.bookingBy);
        });

        const staffPeriodList = locPeriodList.filter(x => {
          if (!x) return false;
          const xCode = normalizeEmpCode(x.empCode || x.empID || x.EmpId || x.employeeId);
          if (xCode && entry.empCodes.includes(xCode)) return true;
          return entry.rentalNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(entry.displayName, x.bookingBy);
        });

        const staffWalkinsList = storeWalkins.filter(w => {
          const wCodes = extractWalkinEmpCodes(w, systemEmpNameToCodeMap);
          if (wCodes.length > 0 && entry.empCodes.some(c => wCodes.includes(c))) return true;
          const wStaff = w.staff || w.staffName || (typeof w.createdBy === 'string' ? w.createdBy : w.createdBy?.name) || w.managerName || '';
          if (!wStaff && entry.displayName.toLowerCase() === "unassigned") return true;
          return isStaffNameMatch(entry.displayName, wStaff) || entry.rentalNames.some(rn => isStaffNameMatch(rn, wStaff)) || entry.siteNames.some(sn => isStaffNameMatch(sn, wStaff));
        });

        const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;
        const ftdWalkins = staffWalkinsList.filter(w => isWalkinCreatedInRange(w.createdAt, ftdTargetDate, ftdTargetDate));
        const periodWalkins = staffWalkinsList.filter(w => isWalkinCreatedInRange(w.createdAt, storePeriodStart, storePeriodEnd));

        const rentalValFtd = staffFtdList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        const rentalValWtd = staffPeriodList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        const rentalBillFtd = staffFtdList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        const rentalBillWtd = staffPeriodList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        const rentalQtyFtd = staffFtdList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
        const rentalQtyWtd = staffPeriodList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);

        let valFtd = rentalValFtd;
        let valWtd = rentalValWtd;
        let billFtd = rentalBillFtd;
        let billWtd = rentalBillWtd;
        let qtyFtd = rentalQtyFtd;
        let qtyWtd = rentalQtyWtd;

        if (funnelView === "Consolidated") {
          // Merge Dappr Squad attributions
          const dapprKey = Object.keys(dapprAttribution).find(k => 
            isStaffNameMatch(k, entry.displayName) || 
            entry.rentalNames.some(rn => isStaffNameMatch(k, rn)) ||
            normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(entry.displayName)
          );
          if (dapprKey) {
            const dAttr = dapprAttribution[dapprKey] || {};
            valFtd += Number(dAttr.billFtd) || 0;
            billFtd += Number(dAttr.valFtd) || 0;
            qtyFtd += Number(dAttr.qtyFtd) || 0;
            valWtd += Number(dAttr.billWtd) || 0;
            billWtd += Number(dAttr.valWtd) || 0;
            qtyWtd += Number(dAttr.qtyWtd) || 0;
          }



          const getSalesDataForStaff = (salesItem) => {
            if (!salesItem || !salesItem.byStaff) return {};

            // 1. Direct empCode lookup if entry has empCodes
            if (entry.empCodes && entry.empCodes.length > 0) {
              for (const code of entry.empCodes) {
                if (salesItem.byStaff[code]) {
                  return salesItem.byStaff[code];
                }
              }
            }

            // 2. Matching by item.empCode or name
            const foundKey = Object.keys(salesItem.byStaff).find(k => {
              const item = salesItem.byStaff[k];
              const itemCode = item?.empCode || normalizeEmpCode(k) || systemEmpNameToCodeMap.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap.get(normalizeForMatch(k));
              if (itemCode && entry.empCodes.includes(itemCode)) return true;
              return isStaffNameMatch(k, entry.displayName) || entry.rentalNames.some(rn => isStaffNameMatch(k, rn)) || entry.siteNames.some(sn => isStaffNameMatch(k, sn));
            });
            return foundKey ? salesItem.byStaff[foundKey] : {};
          };
          const staffSalesFtd = getSalesDataForStaff(salesFtdItem);
          const staffSalesPeriod = getSalesDataForStaff(salesPeriodItem);

          valFtd += staffSalesFtd.value || 0;
          valWtd += staffSalesPeriod.value || 0;
          billFtd += staffSalesFtd.bills || 0;
          billWtd += staffSalesPeriod.bills || 0;
          qtyFtd += staffSalesFtd.qty || 0;
          qtyWtd += staffSalesPeriod.qty || 0;
        }

        const createdValFtd = staffFtdList.reduce((sum, x) => sum + (x.created_Number_Of_Bill || 0), 0);
        const createdValWtd = staffPeriodList.reduce((sum, x) => sum + (x.created_Number_Of_Bill || 0), 0);
        const createdQtyFtd = staffFtdList.reduce((sum, x) => sum + (x.createdQuantity || 0), 0);
        const createdQtyWtd = staffPeriodList.reduce((sum, x) => sum + (x.createdQuantity || 0), 0);

        const walkFtd = ftdWalkins.length;
        const walkWtd = periodWalkins.length;
        const lossFtd = Math.max(0, walkFtd - billFtd);
        const lossWtd = Math.max(0, walkWtd - billWtd);

        return withDerivedMetrics({
          name: entry.displayName, // RENTAL POS SOFTWARE NAME!
          storeName,
          billFtd,
          billWtd,
          valFtd,
          valWtd,
          qtyFtd,
          qtyWtd,
          createdValFtd,
          createdValWtd,
          createdQtyFtd,
          createdQtyWtd,
          walkFtd,
          walkWtd,
          lossFtd,
          lossWtd
        });
      });
    };

    // Real API Data calculations (no mock fallback!)
    if (isAdminOrSuperAdmin || isClusterAdmin) {
      if (selectedStore === "All") {
        // Show store-level summary (Dappr Squad branch is skipped — its data is merged into store rows)
        return branches.map((b) => {
          const storeName = displayBranchName(b.workingBranch);
          const storeKeyVal = locationKey(b.workingBranch);
          const locId = getBranchLocationId(b.workingBranch);

          const locFtdList = performanceData.ftd[locId] || [];
          const locPeriodList = performanceData.period[locId] || [];

          // Dappr Squad (loc 25) data gets merged INTO corresponding stores.
          // The Dappr Squad branch row itself is skipped (returns null below).
          // For all other stores, merge in any matching Dappr Squad entries.
          const isDapprSquadBranch = locId === "25";
          if (isDapprSquadBranch) return null; // Dappr Squad row is hidden; data is merged into store rows

          const dapprFtdList = funnelView === "Consolidated" ? (performanceData.ftd["25"] || []) : [];
          const dapprPeriodList = funnelView === "Consolidated" ? (performanceData.period["25"] || []) : [];
          const dapprFtdForStore = funnelView === "Consolidated" ? getDapprSquadDataForStore(locId, dapprFtdList) : [];
          const dapprPeriodForStore = funnelView === "Consolidated" ? getDapprSquadDataForStore(locId, dapprPeriodList) : [];

          // For G.MG Road (locId "23"): also absorb any Dappr Squad staff not matched to any store
          const isGMGRoad = locId === "23";
          const unmappedDapprFtdList = (isGMGRoad && funnelView === "Consolidated")
            ? dapprFtdList.filter(item => {
                const raw = String(item.bookingBy || "").trim().toLowerCase();
                const normalized = raw.replace(/[^a-z0-9]/g, "");
                const dotted = normalized.startsWith("sg") ? "sg." + normalized.slice(2) : raw;
                return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
              })
            : [];
          const unmappedDapprPeriodList = (isGMGRoad && funnelView === "Consolidated")
            ? dapprPeriodList.filter(item => {
                const raw = String(item.bookingBy || "").trim().toLowerCase();
                const normalized = raw.replace(/[^a-z0-9]/g, "");
                const dotted = normalized.startsWith("sg") ? "sg." + normalized.slice(2) : raw;
                return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
              })
            : [];

          const mergedFtdList = [...locFtdList, ...dapprFtdForStore, ...unmappedDapprFtdList];
          const mergedPeriodList = [...locPeriodList, ...dapprPeriodForStore, ...unmappedDapprPeriodList];

          // Walkin/Loss calculations
          let storePeriodStart = todayStr;
          let storePeriodEnd = todayStr;
          if (activeTab === "WTD") {
            const wtdRange = getStoreWTDDateRange(storeName);
            storePeriodStart = wtdRange.start;
            storePeriodEnd = wtdRange.end;
          } else if (activeTab === "MTD") {
            const today = new Date();
            storePeriodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
            storePeriodEnd = todayStr;
          } else if (activeTab === "Custom") {
            storePeriodStart = customStartDate || todayStr;
            storePeriodEnd = customEndDate || todayStr;
          }

          const storeWalkins = walkins.filter(w => 
            String(w.storeId || '') === String(b._id || '') || 
            locationKey(w.store) === storeKeyVal
          );
          const ftdTargetDate = (activeTab === "Custom" && (appliedEndDate || customEndDate)) ? (appliedEndDate || customEndDate) : todayStr;
          const ftdWalkins = storeWalkins.filter(w => isWalkinCreatedInRange(w.createdAt, ftdTargetDate, ftdTargetDate));
          const periodWalkins = storeWalkins.filter(w => isWalkinCreatedInRange(w.createdAt, storePeriodStart, storePeriodEnd));

          // Performance API aggregations (includes Dappr Squad data merged in)
          let valFtd = mergedFtdList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
          let valWtd = mergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
          let billFtd = mergedFtdList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
          let billWtd = mergedPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
          let qtyFtd = mergedFtdList.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
          let qtyWtd = mergedPeriodList.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

          if (funnelView === "Consolidated") {
            const locCode = b.locCode || getBranchLocCode(b.workingBranch, branches);
            const salesFtdItem = salesData.ftd[locCode] || salesData.ftd[storeKeyVal] || { value: 0, qty: 0, bills: 0 };
            const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { value: 0, qty: 0, bills: 0 };

            valFtd += salesFtdItem.value || 0;
            valWtd += salesPeriodItem.value || 0;
            billFtd += salesFtdItem.bills || 0;
            billWtd += salesPeriodItem.bills || 0;
            qtyFtd += salesFtdItem.qty || 0;
            qtyWtd += salesPeriodItem.qty || 0;


          }

          const createdValFtd = mergedFtdList.reduce((sum, item) => sum + (item.created_Number_Of_Bill || 0), 0);
          const createdValWtd = mergedPeriodList.reduce((sum, item) => sum + (item.created_Number_Of_Bill || 0), 0);
          const createdQtyFtd = mergedFtdList.reduce((sum, item) => sum + (item.createdQuantity || 0), 0);
          const createdQtyWtd = mergedPeriodList.reduce((sum, item) => sum + (item.createdQuantity || 0), 0);

          const walkFtd = ftdWalkins.length;
          const walkWtd = periodWalkins.length;
          const lossFtd = Math.max(0, walkFtd - billFtd);
          const lossWtd = Math.max(0, walkWtd - billWtd);

          return withDerivedMetrics({
            name: storeName,
            storeName,
            billFtd,
            billWtd,
            valFtd,
            valWtd,
            qtyFtd,
            qtyWtd,
            createdValFtd,
            createdValWtd,
            createdQtyFtd,
            createdQtyWtd,
            walkFtd,
            walkWtd,
            lossFtd,
            lossWtd
          });
        }).filter(Boolean); // filter out null entries (Dappr Squad branch is skipped)
      } else {
        // Drill-down view: Show individual staff members of the selected store
        const selectedBranch = branches.find(b => 
          displayBranchName(b.workingBranch) === selectedStore ||
          normalizeForMatch(b.workingBranch) === normalizeForMatch(selectedStore) ||
          locationKey(b.workingBranch) === locationKey(selectedStore)
        );
        if (!selectedBranch) return [];

        const storeName = displayBranchName(selectedBranch.workingBranch);
        const storeKeyVal = locationKey(selectedBranch.workingBranch);
        const locId = getBranchLocationId(selectedBranch.workingBranch);

        const locFtdList = performanceData.ftd[locId] || [];
        const locPeriodList = performanceData.period[locId] || [];

        const locCode = selectedBranch.locCode || getBranchLocCode(selectedBranch.workingBranch, branches);
        const salesFtdItem = salesData.ftd[locCode] || salesData.ftd[storeKeyVal] || { byStaff: {} };
        const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { byStaff: {} };

        return buildStoreStaffRows({
          storeName,
          storeKeyVal,
          locId,
          selectedBranch,
          locFtdList,
          locPeriodList,
          salesFtdItem,
          salesPeriodItem
        });
      }
    } else {
      // Non-admin view: Show individual staff members for all accessible branches
      const allRows = [];
      branches.forEach((b) => {
        const storeName = displayBranchName(b.workingBranch);
        const storeKeyVal = locationKey(b.workingBranch);
        const locId = getBranchLocationId(b.workingBranch);

        const locFtdList = performanceData.ftd[locId] || [];
        const locPeriodList = performanceData.period[locId] || [];

        const locCode = b.locCode || getBranchLocCode(b.workingBranch, branches);
        const salesFtdItem = salesData.ftd[locCode] || salesData.ftd[storeKeyVal] || { byStaff: {} };
        const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { byStaff: {} };

        const storeStaff = buildStoreStaffRows({
          storeName,
          storeKeyVal,
          locId,
          selectedBranch: b,
          locFtdList,
          locPeriodList,
          salesFtdItem,
          salesPeriodItem
        });
        allRows.push(...storeStaff);
      });
      return allRows;
    }
  }, [branches, isAdminOrSuperAdmin, isClusterAdmin, isStoreAdmin, walkins, performanceData, selectedStore, activeTab, customStartDate, customEndDate, funnelView, salesData, dapprAttribution, customizationAttribution, storeCustomizationTotals, storeWeekRanges, week1Dates, week2Dates, week3Dates, week4Dates]);



  const storeToClusterMap = useMemo(() => {
    const map = {};
    branches.forEach((b) => {
      const storeName = displayBranchName(b.workingBranch);
      const clusterName = b.clusterId?.clusterName || "Unassigned";
      map[storeName] = clusterName;
    });
    return map;
  }, [branches]);

  const storeOptions = useMemo(() => {
    let list = branches;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => assignedIds.add(String(b._id || b)));
        }
      });
      list = branches.filter(b => assignedIds.has(String(b._id)));
    }
    return list.map(b => displayBranchName(b.workingBranch)).filter(Boolean).sort(sortStoresGThenZ);
  }, [branches, selectedClusters, clusters]);

  const isStoreSelected = (storeName) => {
    if (!storeName) return false;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => assignedIds.add(String(b._id || b)));
        }
      });
      const branch = branches.find(b => displayBranchName(b.workingBranch) === storeName || b.workingBranch === storeName);
      if (branch && !assignedIds.has(String(branch._id))) return false;
    }
    if (selectedStores.includes("All") || selectedStores.length === 0) return true;
    return selectedStores.includes(storeName);
  };

  const filteredData = useMemo(() => {
    return dsrData.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStore = item.isStaff || (selectedClusters.includes("All") && selectedStores.includes("All")) || isStoreSelected(item.name);
      return matchesSearch && matchesStore;
    });
  }, [dsrData, searchQuery, selectedStores, selectedClusters, clusters, branches]);

  const filteredFunnelRows = useMemo(() => {
    return funnelRows.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStore = (selectedClusters.includes("All") && selectedStores.includes("All")) || isStoreSelected(item.storeName || item.name);
      return matchesSearch && matchesStore;
    });
  }, [funnelRows, searchQuery, selectedStores, selectedClusters, clusters, branches]);

  // Dynamic calculations for Revenue Vs Target metrics cards
  const overallTarget = useMemo(() => {
    return filteredData.reduce((acc, row) => acc + (row.target || 0), 0);
  }, [filteredData]);

  const overallAchieved = useMemo(() => {
    // In Consolidated mode, use the Sales Funnel valWtd total — it is the single source of truth
    // that already includes rental + Dappr Squad + customization + shoe/shirt sales per store.
    // In Rental mode, fall back to dsrData achieved (rental only).
    if (funnelView === "Consolidated") {
      return filteredFunnelRows.reduce((acc, row) => acc + (row.valWtd || 0), 0);
    }
    return filteredData.reduce((acc, row) => acc + (row.achieved || 0), 0);
  }, [filteredData, filteredFunnelRows, funnelView]);

  const overallBalance = useMemo(() => {
    return overallTarget - overallAchieved;
  }, [overallTarget, overallAchieved]);

  const overallPct = useMemo(() => {
    if (overallTarget <= 0) return "0.0";
    const rawPct = (overallAchieved / overallTarget) * 100;
    return rawPct.toFixed(1);
  }, [overallTarget, overallAchieved]);

  // Dynamic calculations for Sales Funnel totals row
  const totalBillFtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + row.billFtd, 0), [filteredFunnelRows]);
  const totalBillWtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + row.billWtd, 0), [filteredFunnelRows]);
  const totalValFtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.valFtd || 0), 0), [filteredFunnelRows]);
  const totalValWtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.valWtd || 0), 0), [filteredFunnelRows]);

  // Grand totals across ALL stores derived directly from performanceData (all locIds).
  // This is always the true all-store denominator regardless of whether funnelRows
  // shows store-level rows (admin) or staff-level rows (store_admin).
  const grandTotalValFtd = useMemo(() => {
    return Object.values(performanceData.ftd).flat().reduce((acc, item) => acc + (item?.total_Number_Of_Bill || 0), 0);
  }, [performanceData]);
  const grandTotalValWtd = useMemo(() => {
    return Object.values(performanceData.period).flat().reduce((acc, item) => acc + (item?.total_Number_Of_Bill || 0), 0);
  }, [performanceData]);

  const grandTotalBillFtd = useMemo(() => {
    let total = 0;
    branches.forEach(b => {
      const locId = getBranchLocationId(b.workingBranch);
      if (!locId || locId === "25") return;
      
      const locFtdList = performanceData.ftd[locId] || [];
      const dapprFtdList = funnelView === "Consolidated" ? (performanceData.ftd["25"] || []) : [];
      const dapprFtdForStore = funnelView === "Consolidated" ? getDapprSquadDataForStore(locId, dapprFtdList) : [];
      const isGMGRoad = locId === "23";
      const unmappedDapprFtdList = (isGMGRoad && funnelView === "Consolidated")
        ? dapprFtdList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];
      const mergedFtdList = [...locFtdList, ...dapprFtdForStore, ...unmappedDapprFtdList];
      total += mergedFtdList.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      if (funnelView === "Consolidated") {
        const locCode = b.locCode;
        if (locCode && salesData.byBranch?.[locCode]) {
          total += salesData.byBranch[locCode].totalValue || 0;
        }
      }
    });
    return total;
  }, [branches, performanceData, salesData, funnelView]);

  const grandTotalBillWtd = useMemo(() => {
    let total = 0;
    branches.forEach(b => {
      const locId = getBranchLocationId(b.workingBranch);
      if (!locId || locId === "25") return;
      
      const locPeriodList = performanceData.period[locId] || [];
      const dapprPeriodList = funnelView === "Consolidated" ? (performanceData.period["25"] || []) : [];
      const dapprPeriodForStore = funnelView === "Consolidated" ? getDapprSquadDataForStore(locId, dapprPeriodList) : [];
      const isGMGRoad = locId === "23";
      const unmappedDapprPeriodList = (isGMGRoad && funnelView === "Consolidated")
        ? dapprPeriodList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];
      const mergedPeriodList = [...locPeriodList, ...dapprPeriodForStore, ...unmappedDapprPeriodList];
      total += mergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      if (funnelView === "Consolidated") {
        const locCode = b.locCode;
        if (locCode && salesData.byBranch?.[locCode]) {
          total += salesData.byBranch[locCode].totalValue || 0;
        }
      }
    });
    return total;
  }, [branches, performanceData, salesData, funnelView]);
  const filteredWalkinsList = useMemo(() => {
    if (!selectedStore || selectedStore === "All") return walkins;
    const selectedBranch = branches.find(b => displayBranchName(b.workingBranch) === selectedStore);
    if (!selectedBranch) return [];
    const storeKeyVal = locationKey(selectedBranch.workingBranch);
    return walkins.filter(w => 
      String(w.storeId || '') === String(selectedBranch._id || '') || 
      locationKey(w.store) === storeKeyVal
    );
  }, [walkins, selectedStore, branches]);

  const totalQtyFtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.qtyFtd || 0), 0), [filteredFunnelRows]);
  const totalQtyWtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.qtyWtd || 0), 0), [filteredFunnelRows]);
  const totalWalkFtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.walkFtd || 0), 0), [filteredFunnelRows]);
  const totalWalkWtd = useMemo(() => filteredFunnelRows.reduce((acc, row) => acc + (row.walkWtd || 0), 0), [filteredFunnelRows]);
  const totalLossFtd = useMemo(() => Math.max(0, totalWalkFtd - totalBillFtd), [totalWalkFtd, totalBillFtd]);
  const totalLossWtd = useMemo(() => Math.max(0, totalWalkWtd - totalBillWtd), [totalWalkWtd, totalBillWtd]);

  const totalAbvFtd = useMemo(() => (totalBillFtd > 0 ? Math.round(totalValFtd / totalBillFtd) : 0), [totalBillFtd, totalValFtd]);
  const totalAbvWtd = useMemo(() => (totalBillWtd > 0 ? Math.round(totalValWtd / totalBillWtd) : 0), [totalBillWtd, totalValWtd]);

  const totalAbsFtd = useMemo(() => (totalBillFtd > 0 ? (totalQtyFtd / totalBillFtd).toFixed(1) : "0.0"), [totalQtyFtd, totalBillFtd]);
  const totalAbsWtd = useMemo(() => (totalBillWtd > 0 ? (totalQtyWtd / totalBillWtd).toFixed(1) : "0.0"), [totalQtyWtd, totalBillWtd]);

  const totalConvFtd = useMemo(() => (totalWalkFtd > 0 ? Math.round((totalBillFtd / totalWalkFtd) * 100) : 0), [totalBillFtd, totalWalkFtd]);
  const totalConvWtd = useMemo(() => (totalWalkWtd > 0 ? Math.round((totalBillWtd / totalWalkWtd) * 100) : 0), [totalBillWtd, totalWalkWtd]);

  const totalArpFtd = useMemo(() => (totalQtyFtd > 0 ? Math.round(totalValFtd / totalQtyFtd) : 0), [totalValFtd, totalQtyFtd]);
  const totalArpWtd = useMemo(() => (totalQtyWtd > 0 ? Math.round(totalValWtd / totalQtyWtd) : 0), [totalValWtd, totalQtyWtd]);

  const denominatorFtd = (selectedStore && selectedStore !== "All") ? totalBillFtd : grandTotalBillFtd;
  const denominatorWtd = (selectedStore && selectedStore !== "All") ? totalBillWtd : grandTotalBillWtd;

  // Generate dynamic Category Contribution data based on fetched branches (with mock fallback)
  const categoryRows = useMemo(() => {
    const defaultStores = [
      { name: "G Thrissur", workingBranch: "G.Thrissur" },
      { name: "SG Edappally", workingBranch: "G-Edappally" },
      { name: "Z Edappally", workingBranch: "Z-Edapally1" },
      { name: "G Edappally", workingBranch: "G-Edappally" },
      { name: "Z Edappal", workingBranch: "Z- Edappal" },
      { name: "Z Perinthalmanna", workingBranch: "Z.Perinthalmanna" },
      { name: "Z Kottakkal", workingBranch: "Z.Kottakkal" },
      { name: "G Kottayam", workingBranch: "G.Kottayam" },
      { name: "G Perumbavoor", workingBranch: "G.Perumbavoor" }
    ];

    const activeList = branches.length > 0
      ? branches.map((b) => ({ name: displayBranchName(b.workingBranch), workingBranch: b.workingBranch, locCode: b.locCode }))
      : defaultStores.map(ds => ({ ...ds, locCode: getBranchLocCode(ds.workingBranch, branches) }));

    // For store_admin: show staff-level rows for their single store
    if (isStoreAdmin && activeList.length === 1) {
      const item = activeList[0];
      const locId = getBranchLocationId(item.workingBranch);
      const locCode = item.locCode || getBranchLocCode(item.workingBranch, branches);
      const storeKeyVal = normalizeForMatch(item.workingBranch);

      const locFtdList = performanceData.ftd[locId] || [];
      const locPeriodList = performanceData.period[locId] || [];

      // Dappr Squad lists (loc 25) — each item has bookingBy = staff name
      const squadFtdList = performanceData.ftd["25"] || [];
      const squadPeriodList = performanceData.period["25"] || [];

      const salesFtdItem  = salesData.ftd[locCode]    || salesData.ftd[storeKeyVal]    || { value: 0, qty: 0, bills: 0 };
      const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { value: 0, qty: 0, bills: 0 };



      // Collect all unique staff names from rental + dappr squad + sales
      const rentalStaffNames = Array.from(new Set([
        ...locFtdList.map(x => x.bookingBy),
        ...locPeriodList.map(x => x.bookingBy)
      ])).filter(Boolean);

      // Filter Dappr Squad lists to only include items belonging to this store
      const storeSquadFtd = squadFtdList.filter(x => {
        const raw = String(x.bookingBy || "").trim().toLowerCase();
        return DAPPR_SQUAD_STORE_MAPPING[raw] === locId || normalizeForMatch(x.bookingBy) === storeKeyVal;
      });
      const storeSquadPeriod = squadPeriodList.filter(x => {
        const raw = String(x.bookingBy || "").trim().toLowerCase();
        return DAPPR_SQUAD_STORE_MAPPING[raw] === locId || normalizeForMatch(x.bookingBy) === storeKeyVal;
      });

      const squadStaffNames = Array.from(new Set([
        ...storeSquadFtd.map(x => x && x.bookingBy),
        ...storeSquadPeriod.map(x => x && x.bookingBy)
      ])).filter(n => typeof n === "string" && n.trim() !== "" && !isStoreAliasName(n));

      const canonicalizeName = (rawName) => {
        if (!rawName) return "";
        const strName = String(rawName);
        if (strName.toLowerCase() === "unassigned") return "Unassigned";
        const canon = getCanonicalStaffName(strName);
        const match = rentalStaffNames.find(n => n && (n === canon || isStaffNameMatch(n, strName))) ||
                      squadStaffNames.find(n => n && (n === canon || isStaffNameMatch(n, strName)));
        return match || canon;
      };

      const salesFtdStaffNames = Object.keys(salesFtdItem.byStaff || {}).map(canonicalizeName).filter(Boolean);
      const salesPeriodStaffNames = Object.keys(salesPeriodItem.byStaff || {}).map(canonicalizeName).filter(Boolean);

      const sysEmpNames = systemEmployees
        .filter(e => {
          if (!e) return false;
          const b = e.workingBranch || e.branch || e.store;
          if (!b) return false;
          const normB = normalizeForMatch(b);
          return normB === storeKeyVal || getBranchLocCode(b, branches) === locCode || displayBranchName(b) === displayBranchName(item.workingBranch);
        })
        .map(e => String(e.name || e.username || e.staffName || "").trim())
        .filter(Boolean);

      // De-duplicate case-insensitively, preferring casing with uppercase letters
      const rawAllStaff = [
        ...sysEmpNames,
        ...rentalStaffNames,
        ...squadStaffNames,
        ...salesFtdStaffNames,
        ...salesPeriodStaffNames,
        ...Object.keys(dapprAttribution),
        ...Object.keys(customizationAttribution)
      ].filter(name => typeof name === "string" && name.trim() !== "").map(getCanonicalStaffName);
      
      const allStaffNames = [];
      
      const sortedStaffNames = Array.from(new Set(rawAllStaff)).sort((a, b) => {
        const aUpper = /[A-Z]/.test(a);
        const bUpper = /[A-Z]/.test(b);
        if (aUpper && !bUpper) return -1;
        if (!aUpper && bUpper) return 1;
        return (b || "").length - (a || "").length;
      });

      sortedStaffNames.forEach(name => {
        if (!name) return;
        const canon = getCanonicalStaffName(name);
        const existing = allStaffNames.find(existingName => isStaffNameMatch(existingName, canon));
        if (!existing) {
          allStaffNames.push(canon);
        }
      });

      // Include "Unassigned" row if there are any unassigned sales
      const hasUnassignedFtd = salesFtdItem.byStaff?.["Unassigned"] || salesFtdItem.byStaff?.["unassigned"];
      const hasUnassignedPeriod = salesPeriodItem.byStaff?.["Unassigned"] || salesPeriodItem.byStaff?.["unassigned"];
      if ((hasUnassignedFtd || hasUnassignedPeriod) && !allStaffNames.includes("Unassigned")) {
        allStaffNames.push("Unassigned");
      }

      // Staff rows — rental, dappr squad & sales product data is per-staff (aggregated case-insensitively)
      const staffRows = allStaffNames.map((staffName) => {
        const staffKey = normalizeForMatch(staffName);
        
        const staffFtdList = locFtdList.filter(x => x && (normalizeForMatch(x.bookingBy) === staffKey || isStaffNameMatch(x.bookingBy, staffName)));
        const staffPeriodList = locPeriodList.filter(x => x && (normalizeForMatch(x.bookingBy) === staffKey || isStaffNameMatch(x.bookingBy, staffName)));
        const squadFtdListForStaff = storeSquadFtd.filter(x => x && (normalizeForMatch(x.bookingBy) === staffKey || isStaffNameMatch(x.bookingBy, staffName)));
        const squadPeriodListForStaff = storeSquadPeriod.filter(x => x && (normalizeForMatch(x.bookingBy) === staffKey || isStaffNameMatch(x.bookingBy, staffName)));

        const rentalValFtd = staffFtdList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        const rentalValWtd = staffPeriodList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        const rentalBillFtd = staffFtdList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        const rentalBillWtd = staffPeriodList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        const rentalQtyFtd = staffFtdList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
        const rentalQtyWtd = staffPeriodList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);

        let squadValFtd = squadFtdListForStaff.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        let squadValWtd = squadPeriodListForStaff.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        let squadBillFtd = squadFtdListForStaff.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        let squadBillWtd = squadPeriodListForStaff.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
        let squadQtyFtd = squadFtdListForStaff.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
        let squadQtyWtd = squadPeriodListForStaff.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);

        // Include manual Dappr Squad attributions for this staff member
        const dapprKey = Object.keys(dapprAttribution).find(k => 
          normalizeForMatch(getCanonicalStaffName(k)) === staffKey || 
          normalizeForMatch(k) === staffKey || 
          isStaffNameMatch(k, staffName)
        );
        if (dapprKey) {
          const dAttr = dapprAttribution[dapprKey] || {};
          squadValFtd += Number(dAttr.billFtd) || 0;
          squadBillFtd += Number(dAttr.valFtd) || 0;
          squadQtyFtd += Number(dAttr.qtyFtd) || 0;

          squadValWtd += Number(dAttr.billWtd) || 0;
          squadBillWtd += Number(dAttr.valWtd) || 0;
          squadQtyWtd += Number(dAttr.qtyWtd) || 0;
        }

        let customValFtd = 0;
        let customValWtd = 0;
        let customBillFtd = 0;
        let customBillWtd = 0;
        let customQtyFtd = 0;
        let customQtyWtd = 0;

        // Include manual Customization attributions for this staff member
        const custKey = Object.keys(customizationAttribution).find(k => 
          normalizeForMatch(getCanonicalStaffName(k)) === staffKey || 
          normalizeForMatch(k) === staffKey || 
          isStaffNameMatch(k, staffName)
        );
        if (custKey) {
          const cAttr = customizationAttribution[custKey] || {};
          customValFtd += Number(cAttr.billFtd) || 0;
          customBillFtd += Number(cAttr.valFtd) || 0;
          customQtyFtd += Number(cAttr.qtyFtd) || 0;

          customValWtd += Number(cAttr.billWtd) || 0;
          customBillWtd += Number(cAttr.valWtd) || 0;
          customQtyWtd += Number(cAttr.qtyWtd) || 0;
        }

        const getSalesDataForStaff = (salesItem) => {
          if (!salesItem || !salesItem.byStaff) return {};
          const canonName = getCanonicalStaffName(staffName);
          const canonKey = normalizeForMatch(canonName);

          if (salesItem.byStaff[staffName]) return salesItem.byStaff[staffName];
          if (salesItem.byStaff[canonName]) return salesItem.byStaff[canonName];
          if (salesItem.byStaff[staffKey]) return salesItem.byStaff[staffKey];
          if (salesItem.byStaff[canonKey]) return salesItem.byStaff[canonKey];

          const foundKey = Object.keys(salesItem.byStaff).find(k => 
            normalizeForMatch(k) === staffKey ||
            normalizeForMatch(k) === canonKey ||
            isStaffNameMatch(k, staffName) ||
            isStaffNameMatch(k, canonName)
          );
          if (foundKey) return salesItem.byStaff[foundKey];
          return {};
        };

        const staffSalesFtd = getSalesDataForStaff(salesFtdItem);
        const staffSalesPeriod = getSalesDataForStaff(salesPeriodItem);

        return {
          name: staffName,
          rentalValFtd:  rentalValFtd,
          rentalValWtd:  rentalValWtd,
          rentalBillFtd: rentalBillFtd,
          rentalBillWtd: rentalBillWtd,
          rentalQtyFtd:  rentalQtyFtd,
          rentalQtyWtd:  rentalQtyWtd,
          squadValFtd:   squadValFtd,
          squadValWtd:   squadValWtd,
          squadBillFtd:  squadBillFtd,
          squadBillWtd:  squadBillWtd,
          squadQtyFtd:   squadQtyFtd,
          squadQtyWtd:   squadQtyWtd,
          customValFtd:  customValFtd,
          customValWtd:  customValWtd,
          customBillFtd: customBillFtd,
          customBillWtd: customBillWtd,
          customQtyFtd:  customQtyFtd,
          customQtyWtd:  customQtyWtd,
          
          salesValFtd:  staffSalesFtd.value  || 0,
          salesValWtd:  staffSalesPeriod.value || 0,
          salesBillFtd: staffSalesFtd.bills  || 0,
          salesBillWtd: staffSalesPeriod.bills || 0,
          salesQtyFtd:  staffSalesFtd.qty    || 0,
          salesQtyWtd:  staffSalesPeriod.qty    || 0,
          isSalesPlaceholder: false,
        };
      });

      // Append a dedicated "Store Sales Total" row only as a fallback if no staff member has any sales attributed to them
      const hasAttributedSales = staffRows.some(row => row.salesValFtd > 0 || row.salesValWtd > 0 || row.salesBillFtd > 0 || row.salesBillWtd > 0);
      const hasSalesData = (salesFtdItem.value || salesPeriodItem.value || salesFtdItem.bills || salesPeriodItem.bills);
      if (hasSalesData && !hasAttributedSales) {
        staffRows.push({
          name: '— Store Sales Total (Fallback) —',
          rentalValFtd: 0, rentalValWtd: 0,
          rentalBillFtd: 0, rentalBillWtd: 0,
          rentalQtyFtd: 0, rentalQtyWtd: 0,
          squadValFtd: 0, squadValWtd: 0,
          squadBillFtd: 0, squadBillWtd: 0,
          squadQtyFtd: 0, squadQtyWtd: 0,
          customValFtd: 0, customValWtd: 0,
          customBillFtd: 0, customBillWtd: 0,
          customQtyFtd: 0, customQtyWtd: 0,
          salesValFtd:  salesFtdItem.value  || 0,
          salesValWtd:  salesPeriodItem.value  || 0,
          salesBillFtd: salesFtdItem.bills  || 0,
          salesBillWtd: salesPeriodItem.bills  || 0,
          salesQtyFtd:  salesFtdItem.qty    || 0,
          salesQtyWtd:  salesPeriodItem.qty    || 0,
          isSalesPlaceholder: true,
        });
      }

      return staffRows;
    }

    // Admin view: one row per store
    return activeList.map((item) => {
      const name = item.name;
      const workingBranch = item.workingBranch;

      // Real API data (NO MOCK DATA!)
      const locId = getBranchLocationId(workingBranch);
      if (locId === "25" || normalizeForMatch(workingBranch) === "dapprsquad" || normalizeForMatch(name) === "dapprsquad") {
        return null; // Hide dedicated Dappr Squad branch row
      }

      const storeKeyVal = normalizeForMatch(workingBranch);
      const locCode = item.locCode || getBranchLocCode(workingBranch, branches);

      // Rental Products (Live API for locId)
      const locFtdList = performanceData.ftd[locId] || [];
      const locPeriodList = performanceData.period[locId] || [];

      const rentalValFtd = locFtdList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
      const rentalValWtd = locPeriodList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
      const rentalBillFtd = locFtdList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
      const rentalBillWtd = locPeriodList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
      const rentalQtyFtd = locFtdList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
      const rentalQtyWtd = locPeriodList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);

      // Dappr Squad (Live API for 25 matching store name)
      const squadFtdList = performanceData.ftd["25"] || [];
      const squadPeriodList = performanceData.period["25"] || [];

      const storeFtdItems = squadFtdList.filter(x => {
        const raw = String(x.bookingBy || "").trim().toLowerCase();
        return DAPPR_SQUAD_STORE_MAPPING[raw] === locId || normalizeForMatch(x.bookingBy) === storeKeyVal;
      });
      const storePeriodItems = squadPeriodList.filter(x => {
        const raw = String(x.bookingBy || "").trim().toLowerCase();
        return DAPPR_SQUAD_STORE_MAPPING[raw] === locId || normalizeForMatch(x.bookingBy) === storeKeyVal;
      });

      const squadValFtd = storeFtdItems.reduce((sum, x) => sum + (x.totalValue || 0), 0);
      const squadValWtd = storePeriodItems.reduce((sum, x) => sum + (x.totalValue || 0), 0);
      const squadBillFtd = storeFtdItems.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
      const squadBillWtd = storePeriodItems.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
      const squadQtyFtd = storeFtdItems.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
      const squadQtyWtd = storePeriodItems.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);

      // Sales Products (Live API)
      const salesFtdItem = salesData.ftd[locCode] || salesData.ftd[storeKeyVal] || { value: 0, qty: 0, bills: 0 };
      const salesPeriodItem = salesData.period[locCode] || salesData.period[storeKeyVal] || { value: 0, qty: 0, bills: 0 };

      const salesValFtd = salesFtdItem.value || 0;
      const salesValWtd = salesPeriodItem.value || 0;
      const salesBillFtd = salesFtdItem.bills || 0;
      const salesBillWtd = salesPeriodItem.bills || 0;
      const salesQtyFtd = salesFtdItem.qty || 0;
      const salesQtyWtd = salesPeriodItem.qty || 0;

      // Customization — look up by store's normalized name (storeCustomizationTotals keyed by normalizeForMatch(storeName))
      const custStoreKey = normalizeForMatch(displayBranchName(workingBranch));
      const custTotals = storeCustomizationTotals[custStoreKey] || {};
      const customValFtd = custTotals.valFtd || 0;
      const customBillFtd = custTotals.billsFtd || 0;
      const customQtyFtd = custTotals.qtyFtd || 0;
      const customValWtd = custTotals.val || 0;
      const customBillWtd = custTotals.bills || 0;
      const customQtyWtd = custTotals.qty || 0;

      return {
        name,
        rentalValFtd, rentalValWtd, rentalBillFtd, rentalBillWtd, rentalQtyFtd, rentalQtyWtd,
        squadValFtd, squadValWtd, squadBillFtd, squadBillWtd, squadQtyFtd, squadQtyWtd,
        customValFtd, customValWtd, customBillFtd, customBillWtd, customQtyFtd, customQtyWtd,
        salesValFtd, salesValWtd, salesBillFtd, salesBillWtd, salesQtyFtd, salesQtyWtd
      };
    }).filter(Boolean);
  }, [branches, isStoreAdmin, performanceData, salesData, dapprAttribution, customizationAttribution, storeCustomizationTotals]);

  const filteredCategoryRows = useMemo(() => {
    return categoryRows.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      // store_admin rows are all staff for their store — no store filter needed
      const matchesStore = isStoreAdmin || (selectedClusters.includes("All") && selectedStores.includes("All")) || isStoreSelected(item.name);
      return matchesSearch && matchesStore;
    });
  }, [categoryRows, searchQuery, selectedStores, selectedClusters, clusters, branches, isStoreAdmin]);

  // Dynamic calculations for category totals row
  const totalRentalValFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalValFtd, 0), [filteredCategoryRows]);
  const totalRentalValWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalValWtd, 0), [filteredCategoryRows]);
  const totalRentalBillFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalBillFtd, 0), [filteredCategoryRows]);
  const totalRentalBillWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalBillWtd, 0), [filteredCategoryRows]);
  const totalRentalQtyFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalQtyFtd, 0), [filteredCategoryRows]);
  const totalRentalQtyWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.rentalQtyWtd, 0), [filteredCategoryRows]);

  const totalSquadValFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadValFtd, 0), [filteredCategoryRows]);
  const totalSquadValWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadValWtd, 0), [filteredCategoryRows]);
  const totalSquadBillFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadBillFtd, 0), [filteredCategoryRows]);
  const totalSquadBillWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadBillWtd, 0), [filteredCategoryRows]);
  const totalSquadQtyFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadQtyFtd, 0), [filteredCategoryRows]);
  const totalSquadQtyWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.squadQtyWtd, 0), [filteredCategoryRows]);

  const totalCustomValFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customValFtd, 0), [filteredCategoryRows]);
  const totalCustomValWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customValWtd, 0), [filteredCategoryRows]);
  const totalCustomBillFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customBillFtd, 0), [filteredCategoryRows]);
  const totalCustomBillWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customBillWtd, 0), [filteredCategoryRows]);
  const totalCustomQtyFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customQtyFtd, 0), [filteredCategoryRows]);
  const totalCustomQtyWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.customQtyWtd, 0), [filteredCategoryRows]);

  const totalSalesValFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesValFtd, 0), [filteredCategoryRows]);
  const totalSalesValWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesValWtd, 0), [filteredCategoryRows]);
  const totalSalesBillFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesBillFtd, 0), [filteredCategoryRows]);
  const totalSalesBillWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesBillWtd, 0), [filteredCategoryRows]);
  const totalSalesQtyFtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesQtyFtd, 0), [filteredCategoryRows]);
  const totalSalesQtyWtd = useMemo(() => filteredCategoryRows.reduce((acc, row) => acc + row.salesQtyWtd, 0), [filteredCategoryRows]);

  const handleExportCSV = () => {
    let csvContent = "";
    let fileName = "";

    if (selectedReport === "Revenue Vs Target" || selectedReport === "Cluster DSR") {
      fileName = `${selectedReport.replace(/\s+/g, "_")}_${activeTab}_${CURRENT_YEAR}.csv`;
      const storeColumnName = selectedReport === "Cluster DSR" ? "Cluster Name" : isStoreAdmin ? "Staff Name" : "Store Name";
      const headers = ["Sl No", storeColumnName, "Target (INR)", "Achieved (INR)", "Balance (INR)", "Achieved (%)"];
      const rows = filteredData.map((row) => [
        row.sl,
        row.name,
        row.target,
        row.achieved,
        Math.abs(row.balance),
        `${row.pct}%`
      ]);
      rows.push([
        "Total",
        selectedReport === "Cluster DSR" ? "ALL CLUSTERS" : "ALL STORES",
        overallTarget,
        overallAchieved,
        Math.abs(overallBalance),
        `${overallPct}%`
      ]);
      
      csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    } else if (selectedReport === "Sales Funnel") {
      fileName = `Sales_Funnel_${activeTab}_${CURRENT_YEAR}.csv`;
      const headers = [
        selectedStore === "All" && !isStoreAdmin ? "Store Name" : "Staff Name",
        "Walk-In (FTD)", `Walk-In (${activeTab})`,
        "Bill (FTD)", `Bill (${activeTab})`,
        "Qty (FTD)", `Qty (${activeTab})`,
        "Value (FTD)", `Value (${activeTab})`,
        "Loss (FTD)", `Loss (${activeTab})`,
        "ABV (FTD)", `ABV (${activeTab})`,
        "ABS (FTD)", `ABS (${activeTab})`,
        "Conv % (FTD)", `Conv % (${activeTab})`,
        "ARP (FTD)", `ARP (${activeTab})`
      ];
      const rows = filteredFunnelRows.map((row) => [
        row.name,
        row.walkFtd, row.walkWtd,
        row.billFtd, row.billWtd,
        row.qtyFtd, row.qtyWtd,
        row.valFtd, row.valWtd,
        row.lossFtd, row.lossWtd,
        row.abvFtd, row.abvWtd,
        row.absFtd, row.absWtd,
        `${row.convFtd}%`, `${row.convWtd}%`,
        row.arpFtd, row.arpWtd
      ]);
      rows.push([
        "Total",
        totalWalkFtd, totalWalkWtd,
        totalBillFtd, totalBillWtd,
        totalQtyFtd, totalQtyWtd,
        totalValFtd, totalValWtd,
        totalLossFtd, totalLossWtd,
        totalAbvFtd, totalAbvWtd,
        totalAbsFtd, totalAbsWtd,
        `${totalConvFtd}%`, `${totalConvWtd}%`,
        totalArpFtd, totalArpWtd
      ]);
      
      csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    } else if (selectedReport === "Category Contribution") {
      fileName = `Category_Contribution_${CURRENT_YEAR}.csv`;
      const headers = [
        "Store Name",
        "Rental Products - Bill FTD", "Rental Products - Bill WTD", "Rental Products - Qty FTD", "Rental Products - Qty WTD", "Rental Products - Value FTD", "Rental Products - Value WTD",
        "Dappr Squad - Bill FTD", "Dappr Squad - Bill WTD", "Dappr Squad - Qty FTD", "Dappr Squad - Qty WTD", "Dappr Squad - Value FTD", "Dappr Squad - Value WTD",
        "Sales Products - Bill FTD", "Sales Products - Bill WTD", "Sales Products - Qty FTD", "Sales Products - Qty WTD", "Sales Products - Value FTD", "Sales Products - Value WTD"
      ];
      const rows = filteredCategoryRows.map((row) => [
        row.name,
        row.rentalBillFtd, row.rentalBillWtd, row.rentalQtyFtd, row.rentalQtyWtd, row.rentalValFtd, row.rentalValWtd,
        row.squadBillFtd, row.squadBillWtd, row.squadQtyFtd, row.squadQtyWtd, row.squadValFtd, row.squadValWtd,
        row.salesBillFtd, row.salesBillWtd, row.salesQtyFtd, row.salesQtyWtd, row.salesValFtd, row.salesValWtd
      ]);
      rows.push([
        "Total",
        totalRentalBillFtd, totalRentalBillWtd, totalRentalQtyFtd, totalRentalQtyWtd, totalRentalValFtd, totalRentalValWtd,
        totalSquadBillFtd, totalSquadBillWtd, totalSquadQtyFtd, totalSquadQtyWtd, totalSquadValFtd, totalSquadValWtd,
        totalSalesBillFtd, totalSalesBillWtd, totalSalesQtyFtd, totalSalesQtyWtd, totalSalesValFtd, totalSalesValWtd
      ]);
      
      csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    } else if (selectedReport === "Customization") {
      fileName = `Customization_${activeTab}_${CURRENT_YEAR}.csv`;
      const storeColumnName = isStoreAdmin ? "Staff Name" : "Store Name";
      const headers = [
        storeColumnName,
        "Bill FTD", `Bill ${activeTab}`,
        "Qty FTD", `Qty ${activeTab}`,
        "Value FTD (INR)", `Value ${activeTab} (INR)`
      ];
      const rows = filteredCategoryRows.map((row) => [
        row.name,
        row.customBillFtd, row.customBillWtd,
        row.customQtyFtd, row.customQtyWtd,
        row.customValFtd, row.customValWtd
      ]);
      rows.push([
        "Store Total",
        totalCustomBillFtd, totalCustomBillWtd,
        totalCustomQtyFtd, totalCustomQtyWtd,
        totalCustomValFtd, totalCustomValWtd
      ]);
      csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    }

    const formatDateForFileName = (dateStr) => {
      if (!dateStr) return '';
      const parts = String(dateStr).split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = String(parseInt(parts[2], 10));
        return `${day}-${month}-${year}`;
      }
      return dateStr;
    };

    const currentStoreName = isStoreAdmin 
      ? (branches[0] ? displayBranchName(branches[0].workingBranch) : "STORE ADMIN") 
      : (selectedStore === "All" ? "ALL STORES" : selectedStore);
    const sanitizedStoreName = String(currentStoreName).toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();

    const reportPageName = String(selectedReport || "DSR REPORT").toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();

    let dateStr = '';
    if (activeTab === "CUSTOM") {
      const startFmt = formatDateForFileName(customStartDate);
      const endFmt = formatDateForFileName(customEndDate);
      dateStr = (startFmt && endFmt && startFmt !== endFmt) ? `${startFmt} TO ${endFmt}` : (startFmt || endFmt);
    } else {
      const startFmt = formatDateForFileName(getLocalDateString(new Date()));
      dateStr = startFmt;
    }

    fileName = `${sanitizedStoreName} - ${reportPageName} REPORT - ${dateStr}`.trim() + '.csv';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f3f4f6] text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* SideNav desktop */}
      <SideNav />
      
      {/* Mobile navigation */}
      <div className="md:hidden">
        <ModileNav />
      </div>

      {/* Main dashboard content */}
      <div className="flex-1 min-w-0 md:ml-[110px] min-h-screen p-4 sm:p-6 lg:p-8 mb-[70px] md:mb-0 overflow-x-hidden">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">DSR Report</h1>
            <p className="text-gray-500 text-[13px] mt-0.5">Real time performance overview across all stores</p>
          </div>

          <div className="flex items-center gap-3">
            {/* MTD / WTD / Custom switcher */}
            <div className="flex bg-[#e5e7eb] p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setActiveTab("MTD")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "MTD" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                MTD
              </button>
              <button 
                onClick={() => setActiveTab("WTD")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "WTD" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                WTD
              </button>
              <button 
                onClick={() => {
                  setActiveTab("Custom");
                  setCustomApplied(false);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "Custom" 
                    ? "bg-[#18181b] text-white shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Custom
              </button>
            </div>

            {activeTab === "Custom" && (
              <div className="flex items-center gap-2 bg-[#f9fafb] border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">From:</span>
                  <input 
                    type="date" 
                    value={tempStartDate} 
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="border-none bg-transparent text-xs font-bold text-gray-700 outline-none p-0 focus:ring-0 cursor-pointer"
                  />
                </div>
                <div className="h-4 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">To:</span>
                  <input 
                    type="date" 
                    value={tempEndDate} 
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="border-none bg-transparent text-xs font-bold text-gray-700 outline-none p-0 focus:ring-0 cursor-pointer"
                  />
                </div>
                <button
                  disabled={isFetchingAny}
                  onClick={() => {
                    if (tempStartDate && tempEndDate) {
                      setCustomStartDate(tempStartDate);
                      setCustomEndDate(tempEndDate);
                      setAppliedStartDate(tempStartDate);
                      setAppliedEndDate(tempEndDate);
                      setCustomApplied(true);
                    }
                  }}
                  className={`ml-1 bg-black hover:bg-gray-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${isFetchingAny ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  {isFetchingAny ? (
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  {isFetchingAny ? "Fetching..." : "Fetch"}
                </button>
              </div>
            )}

            {/* Configure Weeks Button */}
            {!isStoreAdmin && (
              <button 
                onClick={() => setConfigWeeksModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Configure Weeks
              </button>
            )}

            {/* Add Dappr Squad Button — store_admin only */}
            {isStoreAdmin && (
              <button
                onClick={async () => {
                  // Pre-fill inputs from saved attribution (always fetch fresh from DB)
                  const branch = branches[0];
                  if (!branch) return;
                  const rawStaffList = [
                    ...categoryRows.map(r => r.name),
                    ...Object.keys(dapprAttribution || {}),
                    ...Object.keys(dapprInputs || {})
                  ].filter(n => n && n !== "Store Total" && n !== "Unassigned");

                  const staffNames = deduplicateStaffNames(rawStaffList, systemEmpNameToCodeMap, systemEmpCodeToNameMap);

                  // Fetch latest from DB first
                  const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
                  let freshAttribution = { ...dapprAttribution };
                  try {
                    const token = localStorage.getItem("token");
                    const startMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
                    const endMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
                    const targetMonth = (activeTab === "Custom" && startMonth !== endMonth) ? "All" : endMonth;
                    const startYear = activeTab === "Custom" ? getYearFromDateStr(appliedStartDate || customStartDate) : CURRENT_YEAR;
                    const endYear = activeTab === "Custom" ? getYearFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_YEAR;
                    const targetYear = (activeTab === "Custom" && startYear !== endYear) ? "All" : endYear;
                    const res = await fetch(`${baseUrl.baseUrl}api/dappr-attributions?storeName=${encodeURIComponent(targetStore)}&month=${targetMonth}&year=${targetYear}`, {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    const json = await res.json();
                    if (json.success && json.data) {
                      freshAttribution = {};
                      const rawDocs = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
                      const latestDocByStoreAndMonth = {};
                      rawDocs.forEach(doc => {
                        if (!doc || !doc.storeName || !doc.month) return;
                        const key = `${normalizeForMatch(doc.storeName)}_${doc.month}`;
                        const existing = latestDocByStoreAndMonth[key];
                        const docTime = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
                        const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;
                        if (!existing || docTime > existingTime) {
                          latestDocByStoreAndMonth[key] = doc;
                        }
                      });
                      Object.values(latestDocByStoreAndMonth).forEach(doc => {
                        (doc.attributions || []).forEach(attr => {
                          if (!attr?.staffName) return;
                          if (!freshAttribution[attr.staffName]) {
                            freshAttribution[attr.staffName] = { billWtd: 0, valWtd: 0, qtyWtd: 0 };
                          }
                          freshAttribution[attr.staffName].billWtd += Number(attr.billWtd) || 0;
                          freshAttribution[attr.staffName].valWtd += Number(attr.valWtd) || 0;
                          freshAttribution[attr.staffName].qtyWtd += Number(attr.qtyWtd) || 0;
                        });
                      });
                      setDapprAttribution(freshAttribution);
                    }
                  } catch (err) {
                    console.error("Error pre-loading Dappr attributions:", err);
                  }

                  const inputs = {};
                  staffNames.forEach(name => {
                    const matchedKey = Object.keys(freshAttribution).find(k => {
                      if (!k) return false;
                      if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                      if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                      if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                      if (isStaffNameMatch(k, name)) return true;
                      return false;
                    });
                    const saved = matchedKey ? freshAttribution[matchedKey] : {};
                    inputs[name] = {
                      billWtd: saved.billWtd ?? "",
                      valWtd:  saved.valWtd  ?? "",
                      qtyWtd:  saved.qtyWtd  ?? "",
                    };
                  });
                  setDapprInputs(inputs);
                  setDapprModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Add Dappr Squad
              </button>
            )}

            {/* Add Customization Button — store_admin only */}
            {isStoreAdmin && (
              <button
                onClick={async () => {
                  const branch = branches[0];
                  if (!branch) return;
                  const rawStaffList = [
                    ...categoryRows.map(r => r.name),
                    ...Object.keys(customizationAttribution || {}),
                    ...Object.keys(customizationInputs || {})
                  ].filter(n => n && n !== "Store Total" && n !== "Unassigned");

                  const staffNames = deduplicateStaffNames(rawStaffList, systemEmpNameToCodeMap, systemEmpCodeToNameMap);

                  const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
                  let freshAttribution = { ...customizationAttribution };
                  try {
                    await fetchCustomizationAttribution();
                    const token = localStorage.getItem("token");
                    const startMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
                    const endMonth = activeTab === "Custom" ? getMonthNameFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_MONTH_LONG;
                    const targetMonth = (activeTab === "Custom" && startMonth !== endMonth) ? "All" : endMonth;
                    const startYear = activeTab === "Custom" ? getYearFromDateStr(appliedStartDate || customStartDate) : CURRENT_YEAR;
                    const endYear = activeTab === "Custom" ? getYearFromDateStr(appliedEndDate || customEndDate || appliedStartDate || customStartDate) : CURRENT_YEAR;
                    const targetYear = (activeTab === "Custom" && startYear !== endYear) ? "All" : endYear;
                    const res = await fetch(`${baseUrl.baseUrl}api/customization-attributions?storeName=${encodeURIComponent(targetStore)}&month=${targetMonth}&year=${targetYear}`, {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    const json = await res.json();
                    if (json.success && json.data) {
                      freshAttribution = {};
                      const rawDocs = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
                      const latestDocByStoreAndMonth = {};
                      rawDocs.forEach(doc => {
                        if (!doc || !doc.storeName || !doc.month) return;
                        const key = `${normalizeForMatch(doc.storeName)}_${doc.month}`;
                        const existing = latestDocByStoreAndMonth[key];
                        const docTime = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
                        const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;
                        if (!existing || docTime > existingTime) {
                          latestDocByStoreAndMonth[key] = doc;
                        }
                      });
                      Object.values(latestDocByStoreAndMonth).forEach(doc => {
                        (doc.attributions || []).forEach(attr => {
                          if (!attr?.staffName) return;
                          if (!freshAttribution[attr.staffName]) {
                            freshAttribution[attr.staffName] = { billWtd: 0, valWtd: 0, qtyWtd: 0 };
                          }
                          freshAttribution[attr.staffName].billWtd += Number(attr.billWtd) || 0;
                          freshAttribution[attr.staffName].valWtd += Number(attr.valWtd) || 0;
                          freshAttribution[attr.staffName].qtyWtd += Number(attr.qtyWtd) || 0;
                        });
                      });
                      setCustomizationAttribution(freshAttribution);
                    }
                  } catch (err) {
                    console.error("Error pre-loading Customization attributions:", err);
                  }

                  const inputs = {};
                  staffNames.forEach(name => {
                    const matchedKey = Object.keys(freshAttribution).find(k => {
                      if (!k) return false;
                      if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                      if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                      if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                      if (isStaffNameMatch(k, name)) return true;
                      return false;
                    });
                    const saved = matchedKey ? freshAttribution[matchedKey] : {};
                    inputs[name] = {
                      billWtd: saved.billWtd ?? "",
                      valWtd:  saved.valWtd  ?? "",
                      qtyWtd:  saved.qtyWtd  ?? "",
                    };
                  });
                  setCustomizationInputs(inputs);
                  setCustomizationModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Add Customization
              </button>
            )}

            {/* Assign Target Button */}
            {(isAdminOrSuperAdmin || isClusterAdmin || isStoreAdmin) && (
              <button 
                onClick={() => {
                  if (isStoreAdmin) {
                    setTargetAssignMode("Staff");
                    if (branches.length > 0) {
                      const storeName = displayBranchName(branches[0].workingBranch);
                      setModalStore(storeName);
                    }
                  }
                  setAssignTargetModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#18181b] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Assign Target
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Search bar */}
          <div className="relative w-full lg:max-w-xs text-gray-400">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <FiSearch size={16} />
            </span>
            <input 
              type="text" 
              placeholder={selectedReport === "Sales Funnel" ? ((selectedStore === "All" && !isStoreAdmin) ? "Search by Store name" : "Search by Staff name") : "Search by Store name"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#eef1f6] border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Select Cluster Dropdown — hidden for store_admin */}
            {!isStoreAdmin && (
              <div className="relative" ref={clusterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50 focus:outline-none cursor-pointer min-w-[150px]"
                >
                  <span>
                    {selectedClusters.includes("All") || selectedClusters.length === 0
                      ? "Cluster : All"
                      : selectedClusters.length === 1
                        ? `Cluster : ${clusters.find(c => String(c._id) === String(selectedClusters[0]))?.name || "1 Selected"}`
                        : `Clusters (${selectedClusters.length})`
                    }
                  </span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isClusterDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2 text-xs font-sans">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
                      <span className="font-bold text-gray-500 text-[11px]">Select Cluster(s)</span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => { setSelectedClusters(["All"]); setSelectedStores(["All"]); }}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedClusters([]); setSelectedStores(["All"]); }}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedClusters.includes("All")}
                          onChange={() => { setSelectedClusters(["All"]); setSelectedStores(["All"]); }}
                          className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span>All Clusters</span>
                      </label>
                      {clusters.map((c) => {
                        const isChecked = selectedClusters.includes(String(c._id));
                        return (
                          <label key={c._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-gray-700 font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedStores(["All"]);
                                if (selectedClusters.includes("All")) {
                                  setSelectedClusters([String(c._id)]);
                                } else {
                                  if (isChecked) {
                                    const next = selectedClusters.filter(id => id !== String(c._id));
                                    setSelectedClusters(next.length === 0 ? ["All"] : next);
                                  } else {
                                    setSelectedClusters([...selectedClusters, String(c._id)]);
                                  }
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multi-Select Store Dropdown — hidden for store_admin */}
            {!isStoreAdmin && storeOptions.length > 0 && (
              <div className="relative" ref={storeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50 focus:outline-none cursor-pointer min-w-[150px]"
                >
                  <span>
                    {selectedStores.includes("All") || selectedStores.length === 0
                      ? "Store : All"
                      : selectedStores.length === 1
                        ? `Store : ${selectedStores[0]}`
                        : `Stores (${selectedStores.length})`
                    }
                  </span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isStoreDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2 text-xs font-sans">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100 mb-1">
                      <span className="font-bold text-gray-500 text-[11px]">Select Store(s)</span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedStores(["All"])}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStores([])}
                          className="text-red-500 font-bold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col gap-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes("All")}
                          onChange={() => setSelectedStores(["All"])}
                          className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                        />
                        <span>All Stores</span>
                      </label>
                      {storeOptions.map((name) => {
                        const isChecked = selectedStores.includes(name);
                        return (
                          <label key={name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-gray-700 font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (selectedStores.includes("All")) {
                                  setSelectedStores([name]);
                                } else {
                                  if (isChecked) {
                                    const next = selectedStores.filter(s => s !== name);
                                    setSelectedStores(next.length === 0 ? ["All"] : next);
                                  } else {
                                    setSelectedStores([...selectedStores, name]);
                                  }
                                }
                              }}
                              className="rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span>{name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Report Dropdown */}
            <div className="relative" ref={reportDropdownRef}>
              <button 
                onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
                className="flex items-center gap-1.5 bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none"
              >
                <span>Report :</span>
                <span className="text-gray-950 font-extrabold">{selectedReport}</span>
                <svg className={`w-4 h-4 ml-1 text-gray-400 transition-transform duration-200 ${reportDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div 
                className={`absolute right-0 mt-2 w-56 rounded-xl bg-white border border-gray-100 shadow-lg z-50 py-1 origin-top-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  reportDropdownOpen 
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                {["Revenue Vs Target", isAdminOrSuperAdmin && "Cluster DSR", "Sales Funnel", "Category Contribution", "Customization"]
                  .filter(Boolean)
                  .map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedReport(opt);
                      setReportDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                      selectedReport === opt 
                        ? "bg-gray-50 text-gray-950" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                    }`}
                  >
                    {opt}
                    {selectedReport === opt && (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Funnel View Dropdown — shown when report is Sales Funnel or Revenue Vs Target */}
            {(selectedReport === "Sales Funnel" || selectedReport === "Revenue Vs Target" || selectedReport === "Cluster DSR") && (
              <div className="relative" ref={funnelDropdownRef}>
                <button 
                  onClick={() => setFunnelDropdownOpen(!funnelDropdownOpen)}
                  className="flex items-center gap-1.5 bg-white border border-gray-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <span>Type :</span>
                  <span className="text-gray-950 font-extrabold">{funnelView}</span>
                  <svg className={`w-4 h-4 ml-1 text-gray-400 transition-transform duration-200 ${funnelDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Backdrop closer when open */}
                {funnelDropdownOpen && (
                  <div className="fixed inset-0 z-40" onClick={() => setFunnelDropdownOpen(false)} />
                )}

                <div 
                  className={`absolute right-0 mt-2 w-48 rounded-xl bg-white border border-gray-100 shadow-lg z-50 py-1.5 origin-top-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    funnelDropdownOpen 
                      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  }`}
                >
                  {["Rental", "Consolidated"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setFunnelView(opt);
                        setFunnelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                        funnelView === opt 
                          ? "bg-gray-50 text-gray-950" 
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                      }`}
                    >
                      {opt}
                      {funnelView === opt && (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export Button */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-[#eaecf0] hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              <FiDownload size={14} /> Export
            </button>
          </div>
        </div>

        {/* Dynamic Content Switching based on Report selector */}
        {selectedReport === "Revenue Vs Target" && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Card Title Header */}
            <div className="px-6 py-5 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-gray-900">Revenue Vs Target</h2>
                  {isFetchingAny && (
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm animate-pulse">
                      <svg className="animate-spin w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Fetching data...
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-0.5 font-medium font-sans">
                  {activeTab === "MTD" 
                    ? getMTDDateRangeString() 
                    : activeTab === "WTD" 
                      ? getWTDDateRangeString() 
                      : getCustomDateRangeString()}
                </p>
              </div>
            </div>

            {/* Metric Summary Indicators Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-gray-100 divide-x divide-gray-100">
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Target</span>
                <h3 className="text-[22px] font-extrabold text-[#00A36C] mt-1">₹{formatIndianNumber(overallTarget)}</h3>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Achieved Target</span>
                <h3 className="text-[22px] font-extrabold text-[#212121] mt-1">₹{formatIndianNumber(overallAchieved)}</h3>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance</span>
                <h3 className="text-[22px] font-extrabold text-[#e05a47] mt-1">₹{formatIndianNumber(Math.abs(overallBalance))}</h3>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Achieved %</span>
                <h3 className="text-[22px] font-extrabold text-[#212121] mt-1">{overallPct}%</h3>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2e2e2e] text-white text-[11px] font-bold tracking-wider uppercase">
                    <th className="px-6 py-3.5 text-center w-20">Sl No</th>
                    <th className="px-6 py-3.5">
                      {isStoreAdmin ? "Staff Name" : "Store Name"}
                    </th>
                    <th className="px-6 py-3.5 text-right">Target (₹)</th>
                    <th className="px-6 py-3.5 text-right">Achieved (₹)</th>
                    <th className="px-6 py-3.5 text-right">Balance (₹)</th>
                    <th className="px-6 py-3.5 text-center">Achieved (%)</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                  {filteredData.map((row, index) => {
                    let pctColorClass = "text-gray-900";
                    if (row.pct >= 100) {
                      pctColorClass = "text-[#00A36C] font-semibold";
                    } else if (row.pct <= 93) {
                      pctColorClass = "text-[#e05a47] font-semibold";
                    }

                    let targetColorClass = "text-gray-900";
                    if (row.target === 0) {
                      targetColorClass = "text-[#e05a47] font-semibold";
                    }

                    let achievedColorClass = "text-gray-900";
                    if (row.achieved === 0) {
                      achievedColorClass = "text-[#e05a47]";
                    }

                    let balColorClass = row.balance < 0 ? "text-[#00A36C]" : "text-gray-900";
                    if (row.pct <= 93 || row.balance === 0) {
                      balColorClass = "text-[#e05a47]";
                    }

                    return (
                      <tr key={row.sl || index} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-center text-gray-400 font-medium">{row.sl}</td>
                        <td className="px-6 py-3.5 font-bold text-gray-800">{row.name}</td>
                        <td className={`px-6 py-3.5 text-right font-medium ${targetColorClass}`}>
                          {formatIndianNumber(row.target)}
                        </td>
                        <td className={`px-6 py-3.5 text-right font-bold ${achievedColorClass}`}>
                          {formatIndianNumber(row.achieved)}
                        </td>
                        <td className={`px-6 py-3.5 text-right font-bold ${balColorClass}`}>
                          {formatIndianNumber(Math.abs(row.balance))}
                        </td>
                        <td className={`px-6 py-3.5 text-center font-bold ${pctColorClass}`}>
                          {row.pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReport === "Cluster DSR" && (
          <div className="space-y-8">
            {["Zorucci", "South Cluster", "North Cluster", "Unassigned"].map((clusterName) => {
              const stores = dsrData.filter((row) => {
                if (row.isStaff) return false;
                const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesSearch && getClusterForStoreName(row.name) === clusterName;
              });

              if (stores.length === 0) return null;

              const clusterTarget = stores.reduce((sum, s) => sum + (s.target || 0), 0);
              const clusterAchieved = stores.reduce((sum, s) => sum + (s.achieved || 0), 0);
              const clusterBalance = clusterTarget - clusterAchieved;
              const clusterPct = clusterTarget > 0 ? Math.round((clusterAchieved / clusterTarget) * 100) : 0;

              return (
                <div key={clusterName} className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
                  
                  {/* Cluster Title Header */}
                  <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[16px] font-black text-gray-900 tracking-tight">{clusterName}</h2>
                      <p className="text-gray-400 text-[11px] mt-0.5 font-medium">
                        DSR Overview for {clusterName} stores
                      </p>
                    </div>
                    {/* Miniature metrics summary */}
                    <div className="flex items-center gap-5 text-[11px] font-bold text-gray-500">
                      <div>Target: <span className="font-extrabold text-gray-900">₹{formatIndianNumber(clusterTarget)}</span></div>
                      <div>Achieved: <span className="font-extrabold text-[#00A36C]">₹{formatIndianNumber(clusterAchieved)}</span></div>
                      <div>Achieved %: <span className="font-extrabold text-gray-900">{clusterPct}%</span></div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#2e2e2e] text-white text-[11px] font-bold tracking-wider uppercase">
                          <th className="px-6 py-3.5 text-center w-20">Sl No</th>
                          <th className="px-6 py-3.5">Store Name</th>
                          <th className="px-6 py-3.5 text-right">Target (₹)</th>
                          <th className="px-6 py-3.5 text-right">Achieved (₹)</th>
                          <th className="px-6 py-3.5 text-right">Balance (₹)</th>
                          <th className="px-6 py-3.5 text-center">Achieved (%)</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                        {stores.map((store, idx) => {
                          let pctColorClass = "text-gray-900";
                          if (store.pct >= 100) pctColorClass = "text-[#00A36C] font-semibold";
                          else if (store.pct <= 93) pctColorClass = "text-[#e05a47] font-semibold";

                          let targetColorClass = "text-gray-900";
                          if (store.target === 0) targetColorClass = "text-[#e05a47] font-semibold";

                          let achievedColorClass = "text-gray-900";
                          if (store.achieved === 0) achievedColorClass = "text-[#e05a47]";

                          let balColorClass = store.balance < 0 ? "text-[#00A36C]" : "text-gray-900";
                          if (store.pct <= 93 || store.balance === 0) balColorClass = "text-[#e05a47]";

                          return (
                            <tr key={store.name} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                              <td className="px-6 py-3.5 font-bold text-gray-800">{store.name}</td>
                              <td className={`px-6 py-3.5 text-right font-medium ${targetColorClass}`}>
                                {formatIndianNumber(store.target)}
                              </td>
                              <td className={`px-6 py-3.5 text-right font-bold ${achievedColorClass}`}>
                                {formatIndianNumber(store.achieved)}
                              </td>
                              <td className={`px-6 py-3.5 text-right font-bold ${balColorClass}`}>
                                {formatIndianNumber(Math.abs(store.balance))}
                              </td>
                              <td className={`px-6 py-3.5 text-center font-bold ${pctColorClass}`}>
                                {store.pct}%
                              </td>
                            </tr>
                          );
                        })}

                        {/* Cluster Total Row */}
                        <tr className="bg-gray-50/80 font-black border-t border-b border-gray-200">
                          <td className="px-6 py-3.5 text-center text-gray-400 font-medium">—</td>
                          <td className="px-6 py-3.5 font-extrabold text-[#18181b]">{clusterName} Total</td>
                          <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{formatIndianNumber(clusterTarget)}</td>
                          <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{formatIndianNumber(clusterAchieved)}</td>
                          <td className="px-6 py-3.5 text-right font-extrabold text-[#e05a47]">{formatIndianNumber(Math.abs(clusterBalance))}</td>
                          <td className={`px-6 py-3.5 text-center font-extrabold ${clusterPct >= 100 ? 'text-[#00A36C]' : 'text-[#e05a47]'}`}>{clusterPct}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedReport === "Sales Funnel" && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-gray-900">Sales Funnel ({funnelView})</h2>
                {isStoreAdmin && selectedStore !== "All" && (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{selectedStore}</span>
                )}
                {isFetchingAny && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm animate-pulse">
                    <svg className="animate-spin w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Fetching data...
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs font-semibold">
                {activeTab === "MTD" 
                  ? getMTDDateRangeString() 
                  : activeTab === "WTD" 
                    ? getWTDDateRangeString() 
                    : getCustomDateRangeString()}
              </p>
            </div>

            {/* Sales Funnel Grid Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-center border-collapse">
                <thead>
                  {/* Primary header row */}
                  <tr className="bg-[#2e2e2e] text-white text-[11px] font-bold tracking-wider uppercase border-b border-gray-600">
                    <th rowSpan={2} className="sticky left-0 z-20 bg-[#2e2e2e] px-6 py-4 text-left border-r border-gray-600 w-60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">{(selectedStore === "All" && !isStoreAdmin) ? "Store Name" : "Staff Name"}</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Walk In</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Bill</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Quantity</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Value</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Loss</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">ABV</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">ABS</th>
                    <th colSpan={2} className="px-6 py-2 border-r border-gray-600 text-center">Conversion (%)</th>
                    <th colSpan={2} className={`px-6 py-2 ${isStoreAdmin ? "" : "border-r border-gray-600"} text-center`}>Contribution (%)</th>
                    {!isStoreAdmin && <th colSpan={2} className="px-6 py-2 text-center">ARP</th>}
                  </tr>
                  {/* Secondary header row */}
                  <tr className="bg-[#2e2e2e] text-white text-[10px] font-bold tracking-wider uppercase">
                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>
                    
                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>
                    
                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className="px-4 py-2 border-r border-gray-600">{activeTab}</th>

                    <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                    <th className={`px-4 py-2 ${isStoreAdmin ? "" : "border-r border-gray-600"}`}>{activeTab}</th>

                    {!isStoreAdmin && (
                      <>
                        <th className="px-4 py-2 border-r border-gray-600">FTD</th>
                        <th className="px-4 py-2">{activeTab}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                  {filteredFunnelRows.map((row, idx) => {
                    const contributionFtd = (totalValFtd !== 0 && row.valFtd) ? Math.round((row.valFtd / totalValFtd) * 100) : 0;
                    const contributionWtd = (totalValWtd !== 0 && row.valWtd) ? Math.round((row.valWtd / totalValWtd) * 100) : 0;
                    
                    return (
                      <tr key={idx} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors">
                        <td className={`sticky left-0 z-10 px-6 py-3.5 text-left font-semibold text-gray-800 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"}`}>{row.name}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100">{renderCellVal(row.walkFtd)}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700">{renderCellVal(row.walkWtd)}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100">{renderCellVal(formatIndianNumber(row.billFtd))}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700">{renderCellVal(formatIndianNumber(row.billWtd))}</td>
                        
                        <td className="px-4 py-3.5 border-r border-gray-100">{renderCellVal(row.qtyFtd)}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700">{renderCellVal(row.qtyWtd)}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100">{renderCellVal(formatIndianNumber(row.valFtd))}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700">{renderCellVal(formatIndianNumber(row.valWtd))}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100">{renderCellVal(row.lossFtd)}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700">{renderCellVal(row.lossWtd)}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100 font-medium">{renderCellVal(formatIndianNumber(row.abvFtd !== undefined ? row.abvFtd : Math.round(row.valFtd / (row.billFtd || 1))))}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700 font-medium">{renderCellVal(formatIndianNumber(row.abvWtd !== undefined ? row.abvWtd : Math.round(row.valWtd / (row.billWtd || 1))))}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100 font-medium">{renderCellVal(row.absFtd !== undefined ? row.absFtd : (row.qtyFtd / (row.billFtd || 1)).toFixed(1))}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700 font-medium">{renderCellVal(row.absWtd !== undefined ? row.absWtd : (row.qtyWtd / (row.billFtd || 1)).toFixed(1))}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100 font-medium">{renderCellVal(row.convFtd !== undefined ? row.convFtd : Math.round((row.billFtd / (row.walkFtd || 1)) * 100), true)}</td>
                        <td className="px-4 py-3.5 border-r border-gray-100 text-gray-700 font-medium">{renderCellVal(row.convWtd !== undefined ? row.convWtd : Math.round((row.billWtd / (row.walkWtd || 1)) * 100), true)}</td>

                        <td className="px-4 py-3.5 border-r border-gray-100 font-semibold text-[#00A36C]">{renderCellVal(contributionFtd, true)}</td>
                        <td className={`px-4 py-3.5 ${isStoreAdmin ? "" : "border-r border-gray-100"} text-gray-700 font-semibold text-[#00A36C]`}>{renderCellVal(contributionWtd, true)}</td>

                        {!isStoreAdmin && (
                          <>
                            <td className="px-4 py-3.5 border-r border-gray-100 font-medium">{renderCellVal(formatIndianNumber(row.arpFtd !== undefined ? row.arpFtd : Math.round(row.billFtd / (row.qtyFtd || 1))))}</td>
                            <td className="px-4 py-3.5 text-gray-700 font-medium">{renderCellVal(formatIndianNumber(row.arpWtd !== undefined ? row.arpWtd : Math.round(row.billWtd / (row.qtyWtd || 1))))}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {/* STORE TOTAL row */}
                  <tr className="bg-[#dce9f5] font-bold text-gray-900">
                    <td className="sticky left-0 z-10 bg-[#dce9f5] px-6 py-3.5 text-left border-r border-blue-200/50 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Store Total</td>
                    
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalWalkFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalWalkWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalBillFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalBillWtd))}</td>
                    
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalQtyFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalQtyWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalValFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalValWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalLossFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalLossWtd))}</td>

                    {/* ABV */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalAbvFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalAbvWtd))}</td>

                    {/* ABS */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(totalAbsFtd)}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(totalAbsWtd)}</td>

                    {/* Conversion */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(totalConvFtd, true)}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(totalConvWtd, true)}</td>

                    {/* Contribution */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(totalValFtd !== 0 ? "100%" : "0%")}</td>
                    <td className={`px-4 py-3.5 ${isStoreAdmin ? "" : "border-r border-blue-200/50"}`}>{renderCellVal(totalValWtd !== 0 ? "100%" : "0%")}</td>

                    {!isStoreAdmin && (
                      <>
                        {/* ARP */}
                        <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalArpFtd))}</td>
                        <td className="px-4 py-3.5">{renderCellVal(formatIndianNumber(totalArpWtd))}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReport === "Category Contribution" && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-gray-900">Category Contribution</h2>
                {isStoreAdmin && selectedStore !== "All" && (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{selectedStore}</span>
                )}
                {isFetchingAny && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm animate-pulse">
                    <svg className="animate-spin w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Fetching data...
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs font-semibold">
                {activeTab === "MTD" 
                  ? getMTDDateRangeString() 
                  : activeTab === "WTD" 
                    ? getWTDDateRangeString() 
                    : getCustomDateRangeString()}
              </p>
            </div>

            {/* Category Contribution Table */}
            <div className="overflow-x-auto w-full p-4">
              <table className="w-full text-center border-collapse">
                <thead>
                  {/* Primary header row */}
                  <tr className="text-white text-[11px] font-bold tracking-wider uppercase">
                    <th rowSpan={3} className="sticky left-0 z-20 bg-[#2e2e2e] text-white px-6 py-4 text-left rounded-[16px] w-60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] border-none">
                      {isStoreAdmin ? "Staff Name" : "Store Name"}
                    </th>
                    {/* Spacer column margin between pills */}
                    <th className="w-2 bg-white" rowSpan={3}></th>
                    
                    <th colSpan={6} className="bg-[#2e2e2e] text-white rounded-t-[16px] py-3 text-center border-b border-gray-600/50 border-none">
                      Rental Products
                    </th>
                    {/* Spacer column margin between pills */}
                    <th className="w-2 bg-white" rowSpan={3}></th>
                    
                    <th colSpan={6} className="bg-[#2e2e2e] text-white rounded-t-[16px] py-3 text-center border-b border-gray-600/50 border-none">
                      Dappr Squad
                    </th>
                    {/* Spacer column margin between pills */}
                    <th className="w-2 bg-white" rowSpan={3}></th>
                    
                    <th colSpan={6} className="bg-[#2e2e2e] text-white rounded-t-[16px] py-3 text-center border-b border-gray-600/50 border-none">
                      Customization
                    </th>
                    {/* Spacer column margin between pills */}
                    <th className="w-2 bg-white" rowSpan={3}></th>
                    
                    <th colSpan={6} className="bg-[#2e2e2e] text-white rounded-t-[16px] py-3 text-center border-b border-gray-600/50 border-none">
                      Sales Products
                    </th>
                  </tr>
                  
                  {/* Secondary header row */}
                  <tr className="bg-[#e5ecf6] text-gray-700 text-[10px] font-bold tracking-wider uppercase border-b border-gray-200">
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Bill</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Quantity</th>
                    <th colSpan={2} className="px-4 py-2 text-center">Value</th>
                    
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Bill</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Quantity</th>
                    <th colSpan={2} className="px-4 py-2 text-center">Value</th>

                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Bill</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Quantity</th>
                    <th colSpan={2} className="px-4 py-2 text-center">Value</th>

                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Bill</th>
                    <th colSpan={2} className="px-4 py-2 border-r border-gray-200/50 text-center">Quantity</th>
                    <th colSpan={2} className="px-4 py-2 text-center">Value</th>
                  </tr>
                  
                  {/* Tertiary header row */}
                  <tr className="bg-[#e5ecf6] text-gray-600 text-[9px] font-bold tracking-wider uppercase border-b border-gray-200">
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 text-center">{activeTab}</th>
                    
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 text-center">{activeTab}</th>

                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 text-center">{activeTab}</th>

                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">{activeTab}</th>
                    <th className="px-4 py-1.5 border-r border-gray-200/50 text-center">FTD</th>
                    <th className="px-4 py-1.5 text-center">{activeTab}</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                  {filteredCategoryRows.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors">
                      {/* Sticky Store Name cell */}
                      <td className={`sticky left-0 z-10 px-6 py-3.5 text-left font-semibold text-gray-800 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] border-none ${idx % 2 === 0 ? "bg-white" : "bg-[#f9fafb]"}`}>
                        {row.name}
                      </td>
                      {/* Spacer cell */}
                      <td className="w-2 bg-white border-none"></td>
                      
                      {/* Rental Products Cells */}
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.rentalBillFtd && "text-red-500"}`}>{renderCellVal(row.rentalBillFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.rentalBillWtd && "text-red-500"}`}>{renderCellVal(row.rentalBillWtd)}</td>
                      
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.rentalQtyFtd && "text-red-500"}`}>{renderCellVal(row.rentalQtyFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.rentalQtyWtd && "text-red-500"}`}>{renderCellVal(row.rentalQtyWtd)}</td>
                      
                      <td className={`px-4 py-3.5 border-r border-gray-100 font-medium ${!row.rentalValFtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.rentalValFtd))}</td>
                      <td className={`px-4 py-3.5 text-gray-700 font-medium ${!row.rentalValWtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.rentalValWtd))}</td>
                      
                      {/* Spacer cell */}
                      <td className="w-2 bg-white border-none"></td>
                      
                      {/* Dappr Squad Cells */}
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.squadBillFtd && "text-red-500"}`}>{renderCellVal(row.squadBillFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.squadBillWtd && "text-red-500"}`}>{renderCellVal(row.squadBillWtd)}</td>

                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.squadQtyFtd && "text-red-500"}`}>{renderCellVal(row.squadQtyFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.squadQtyWtd && "text-red-500"}`}>{renderCellVal(row.squadQtyWtd)}</td>

                      <td className={`px-4 py-3.5 border-r border-gray-100 font-medium ${!row.squadValFtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.squadValFtd))}</td>
                      <td className={`px-4 py-3.5 text-gray-700 font-medium ${!row.squadValWtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.squadValWtd))}</td>

                      {/* Spacer cell */}
                      <td className="w-2 bg-white border-none"></td>

                      {/* Customization Cells */}
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.customBillFtd && "text-red-500"}`}>{renderCellVal(row.customBillFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.customBillWtd && "text-red-500"}`}>{renderCellVal(row.customBillWtd)}</td>

                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.customQtyFtd && "text-red-500"}`}>{renderCellVal(row.customQtyFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.customQtyWtd && "text-red-500"}`}>{renderCellVal(row.customQtyWtd)}</td>

                      <td className={`px-4 py-3.5 border-r border-gray-100 font-medium ${!row.customValFtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.customValFtd))}</td>
                      <td className={`px-4 py-3.5 text-gray-700 font-medium ${!row.customValWtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.customValWtd))}</td>

                      {/* Spacer cell */}
                      <td className="w-2 bg-white border-none"></td>

                      {/* Sales Products Cells */}
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.salesBillFtd && "text-red-500"}`}>{renderCellVal(row.salesBillFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.salesBillWtd && "text-red-500"}`}>{renderCellVal(row.salesBillWtd)}</td>
                      
                      <td className={`px-4 py-3.5 border-r border-gray-100 ${!row.salesQtyFtd && "text-red-500"}`}>{renderCellVal(row.salesQtyFtd)}</td>
                      <td className={`px-4 py-3.5 border-r border-gray-100 text-gray-700 ${!row.salesQtyWtd && "text-red-500"}`}>{renderCellVal(row.salesQtyWtd)}</td>

                      <td className={`px-4 py-3.5 border-r border-gray-100 font-medium ${!row.salesValFtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.salesValFtd))}</td>
                      <td className={`px-4 py-3.5 text-gray-700 font-medium ${!row.salesValWtd && "text-red-500"}`}>{renderCellVal(formatIndianNumber(row.salesValWtd))}</td>
                    </tr>
                  ))}

                  {/* STORE TOTAL row */}
                  <tr className="bg-[#dce9f5] font-bold text-gray-900">
                    <td className="sticky left-0 z-10 bg-[#dce9f5] px-6 py-3.5 text-left border-r border-blue-200/50 uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] border-none">Store Total</td>
                    {/* Spacer cell */}
                    <td className="w-2 bg-white border-none"></td>
                    
                    {/* Rental Products Totals */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalRentalBillFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalRentalBillWtd))}</td>
                    
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalRentalQtyFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalRentalQtyWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalRentalValFtd))}</td>
                    <td className="px-4 py-3.5">{renderCellVal(formatIndianNumber(totalRentalValWtd))}</td>
                    
                    {/* Spacer cell */}
                    <td className="w-2 bg-white border-none"></td>
                    
                    {/* Dappr Squad Totals */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSquadBillFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSquadBillWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSquadQtyFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSquadQtyWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSquadValFtd))}</td>
                    <td className="px-4 py-3.5">{renderCellVal(formatIndianNumber(totalSquadValWtd))}</td>

                    {/* Spacer cell */}
                    <td className="w-2 bg-white border-none"></td>

                    {/* Customization Totals */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalCustomBillFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalCustomBillWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalCustomQtyFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalCustomQtyWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalCustomValFtd))}</td>
                    <td className="px-4 py-3.5">{renderCellVal(formatIndianNumber(totalCustomValWtd))}</td>

                    {/* Spacer cell */}
                    <td className="w-2 bg-white border-none"></td>

                    {/* Sales Products Totals */}
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSalesBillFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSalesBillWtd))}</td>
                    
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSalesQtyFtd))}</td>
                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSalesQtyWtd))}</td>

                    <td className="px-4 py-3.5 border-r border-blue-200/50">{renderCellVal(formatIndianNumber(totalSalesValFtd))}</td>
                    <td className="px-4 py-3.5">{renderCellVal(formatIndianNumber(totalSalesValWtd))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReport === "Customization" && (
          <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-gray-900">Customization Report</h2>
                {isStoreAdmin && selectedStore !== "All" && (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{selectedStore}</span>
                )}
                {isFetchingAny && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-sm animate-pulse">
                    <svg className="animate-spin w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Fetching data...
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs font-semibold">
                {activeTab === "MTD" 
                  ? getMTDDateRangeString() 
                  : activeTab === "WTD" 
                    ? getWTDDateRangeString() 
                    : getCustomDateRangeString()}
              </p>
            </div>

            {/* Metric Summary Grid */}
            <div className="grid grid-cols-3 border-t border-b border-gray-100 divide-x divide-gray-100">
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Customization Value</span>
                <h3 className="text-[22px] font-extrabold text-[#10b981] mt-1">₹{formatIndianNumber(totalCustomValWtd)}</h3>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Bills</span>
                <h3 className="text-[22px] font-extrabold text-[#212121] mt-1">{totalCustomBillWtd}</h3>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Quantity</span>
                <h3 className="text-[22px] font-extrabold text-[#212121] mt-1">{totalCustomQtyWtd}</h3>
              </div>
            </div>

            {/* Customization Data Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2e2e2e] text-white text-[11px] font-bold tracking-wider uppercase">
                    <th className="px-6 py-3.5 text-center w-20">Sl No</th>
                    <th className="px-6 py-3.5">
                      {isStoreAdmin ? "Staff Name" : "Store Name"}
                    </th>
                    <th className="px-6 py-3.5 text-right">Value (₹ FTD)</th>
                    <th className="px-6 py-3.5 text-right">Value (₹ {activeTab})</th>
                    <th className="px-6 py-3.5 text-right">Bill (FTD)</th>
                    <th className="px-6 py-3.5 text-right">Bill ({activeTab})</th>
                    <th className="px-6 py-3.5 text-right">Quantity (FTD)</th>
                    <th className="px-6 py-3.5 text-right">Quantity ({activeTab})</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                  {filteredCategoryRows.map((row, index) => (
                    <tr key={row.name || index} className="odd:bg-white even:bg-[#f9fafb] hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-center text-gray-400 font-medium">{index + 1}</td>
                      <td className="px-6 py-3.5 font-bold text-gray-800">{row.name}</td>
                      <td className="px-6 py-3.5 text-right font-medium">{renderCellVal(formatIndianNumber(row.customValFtd))}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#10b981]">{renderCellVal(formatIndianNumber(row.customValWtd))}</td>
                      <td className="px-6 py-3.5 text-right font-medium">{renderCellVal(row.customBillFtd)}</td>
                      <td className="px-6 py-3.5 text-right font-bold">{renderCellVal(row.customBillWtd)}</td>
                      <td className="px-6 py-3.5 text-right font-medium">{renderCellVal(row.customQtyFtd)}</td>
                      <td className="px-6 py-3.5 text-right font-bold">{renderCellVal(row.customQtyWtd)}</td>
                    </tr>
                  ))}

                  {/* STORE TOTAL row */}
                  <tr className="bg-[#dce9f5] font-bold text-gray-900">
                    <td className="px-6 py-3.5 text-center text-gray-400 font-medium">—</td>
                    <td className="px-6 py-3.5 font-extrabold text-[#18181b]">Store Total</td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{formatIndianNumber(totalCustomValFtd)}</td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-[#10b981]">{formatIndianNumber(totalCustomValWtd)}</td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{totalCustomBillFtd}</td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{totalCustomBillWtd}</td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{totalCustomQtyFtd}</td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-gray-900">{totalCustomQtyWtd}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dappr Squad Attribution Modal — store_admin only */}
        {dapprModalOpen && (() => {
          const branch = branches[0];
          const locId = branch ? getBranchLocationId(branch.workingBranch) : null;
          const dapprPeriod = locId ? getDapprSquadDataForStore(locId, performanceData.period["25"] || []) : [];
          const dapprTotalValue = dapprPeriod.reduce((s, x) => s + (x.totalValue || 0), 0);
          const dapprTotalBills = dapprPeriod.reduce((s, x) => s + (x.total_Number_Of_Bill || 0), 0);
          const dapprTotalQty = dapprPeriod.reduce((s, x) => s + (x.totalQuantity || 0), 0);

          const rawStaff = [
            ...categoryRows.map(r => r.name),
            ...Object.keys(dapprAttribution || {}),
            ...Object.keys(dapprInputs || {})
          ].filter(n => n && n !== "Store Total" && n !== "Unassigned");
          const staffList = deduplicateStaffNames(rawStaff, systemEmpNameToCodeMap, systemEmpCodeToNameMap);

          const allocatedBills = Object.values(dapprInputs).reduce((s, v) => s + (Number(v.valWtd) || 0), 0);
          const allocatedValue = Object.values(dapprInputs).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
          const allocatedQty = Object.values(dapprInputs).reduce((s, v) => s + (Number(v.qtyWtd) || 0), 0);
          const isOverLimit = allocatedValue > dapprTotalValue;

          const getInputValue = (inputsObj, staffName, field) => {
            if (!inputsObj || !staffName) return "";
            if (inputsObj[staffName] && inputsObj[staffName][field] !== undefined) {
              return inputsObj[staffName][field];
            }
            const matchedKey = Object.keys(inputsObj).find(k => {
              if (!k) return false;
              if (k.trim().toLowerCase() === staffName.trim().toLowerCase()) return true;
              if (normalizeForMatch(k) === normalizeForMatch(staffName)) return true;
              if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(staffName))) return true;
              if (isStaffNameMatch(k, staffName)) return true;
              return false;
            });
            return matchedKey ? (inputsObj[matchedKey][field] ?? "") : "";
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[6px]" onClick={() => setDapprModalOpen(false)} />
              <div className="bg-white rounded-[28px] w-full max-w-[540px] shadow-2xl relative z-10 border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-[15px] font-extrabold text-gray-900">Add Dappr Squad</h2>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      Attribute Dappr Squad revenue to store staff
                    </p>
                  </div>
                  <button onClick={() => setDapprModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
                </div>

                {/* Dappr Squad Store Total */}
                <div className="mx-6 mt-4 mb-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Dappr Squad Total (this store)</p>
                    <p className="text-[18px] font-extrabold text-indigo-700 mt-0.5">
                      ₹{dapprTotalValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Bills</p>
                      <p className="text-[18px] font-extrabold text-indigo-700">{dapprTotalBills}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Qty</p>
                      <p className="text-[18px] font-extrabold text-indigo-700">{dapprTotalQty}</p>
                    </div>
                  </div>
                </div>

                {/* Allocated so far */}
                <div className="mx-6 mb-3 flex gap-2 text-[11px] font-semibold text-gray-500">
                  <span>Allocated: ₹{allocatedValue.toLocaleString()} / {allocatedBills} bills / {allocatedQty} qty</span>
                  <span className="text-gray-300">|</span>
                  <span className={isOverLimit ? "text-red-500 font-bold" : "text-emerald-600"}>
                    Remaining: ₹{(dapprTotalValue - allocatedValue).toLocaleString()}
                  </span>
                </div>

                {/* Over-limit Warning Alert Banner */}
                {isOverLimit && (
                  <div className="mx-6 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Allocated amount (₹{allocatedValue.toLocaleString()}) exceeds total (₹{dapprTotalValue.toLocaleString()})</span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded-full shrink-0">Exceeded</span>
                  </div>
                )}

                {/* Staff rows */}
                <div className="px-6 pb-2 max-h-[340px] overflow-y-auto space-y-2">
                  {staffList.length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-6">No staff found for this store</p>
                  )}
                  {staffList.map(name => (
                    <div key={name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="flex-1 text-[12px] font-bold text-gray-800 truncate">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Value (₹)</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(dapprInputs, name, "billWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setDapprInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), billWtd: val }
                                };
                              });
                            }}
                            className={`w-24 text-center text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isOverLimit ? "border-red-300 focus:border-red-500 bg-red-50/50" : "border-gray-200 focus:border-indigo-400"
                            }`}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Bills</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(dapprInputs, name, "valWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setDapprInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), valWtd: val }
                                };
                              });
                            }}
                            className="w-20 text-center text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Qty</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(dapprInputs, name, "qtyWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setDapprInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), qtyWtd: val }
                                };
                              });
                            }}
                            className="w-20 text-center text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const cleared = {};
                      staffList.forEach(n => { cleared[n] = { billWtd: "", valWtd: "", qtyWtd: "" }; });
                      setDapprInputs(cleared);
                    }}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Clear All
                  </button>
                  <button
                    disabled={isOverLimit}
                    onClick={async () => {
                      if (isOverLimit) {
                        alert("Allocated amount cannot exceed the Dappr Squad total.");
                        return;
                      }
                      const saved = {};
                      const attributionsList = [];
                      Object.entries(dapprInputs).forEach(([name, v]) => {
                        const bv = Number(v.billWtd) || 0;
                        const vv = Number(v.valWtd)  || 0;
                        const qv = Number(v.qtyWtd)  || 0;
                        if (bv > 0 || vv > 0 || qv > 0) {
                          saved[name] = { billWtd: bv, valWtd: vv, qtyWtd: qv };
                          attributionsList.push({ staffName: name, billWtd: bv, valWtd: vv, qtyWtd: qv });
                        }
                      });
                      setDapprAttribution(saved);
                      localStorage.setItem("dapprAttribution", JSON.stringify(saved));
                      
                      try {
                        const token = localStorage.getItem("token");
                        const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
                        const targetMonth = activeTab === "Custom" ? getMonthNameFromDateStr(customStartDate) : CURRENT_MONTH_LONG;
                        const targetYear = activeTab === "Custom" ? getYearFromDateStr(customStartDate) : CURRENT_YEAR;
                        const currentWeek = getCurrentWeekId(targetStore) || 1;

                        await fetch(`${baseUrl.baseUrl}api/dappr-attributions`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            storeName: targetStore,
                            month: targetMonth,
                            year: Number(targetYear),
                            week: 1,
                            attributions: attributionsList
                          })
                        });
                      } catch (err) {
                        console.error("Error saving Dappr attribution to MongoDB:", err);
                      }

                      setDapprModalOpen(false);
                    }}
                    className={`text-xs font-bold py-2.5 px-6 rounded-xl transition-all ${
                      isOverLimit 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 opacity-70" 
                        : "bg-[#18181b] hover:bg-black text-white cursor-pointer shadow-sm"
                    }`}
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Add Customization Attribution Modal — store_admin only */}
        {customizationModalOpen && (() => {
          const branch = branches[0];
          const locId = branch ? getBranchLocationId(branch.workingBranch) : "1";

          const rawStaff = [
            ...categoryRows.map(r => r.name),
            ...Object.keys(customizationAttribution || {}),
            ...Object.keys(customizationInputs || {})
          ].filter(n => n && n !== "Store Total" && n !== "Unassigned");
          const staffList = deduplicateStaffNames(rawStaff, systemEmpNameToCodeMap, systemEmpCodeToNameMap);

          const targetStoreName = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
          const storeCustObj = getStoreCustomizationTotal(targetStoreName, storeCustomizationTotals);
          const customizationTotalValue = (activeTab === "FTD" && (storeCustObj?.valFtd > 0 || storeCustObj?.billsFtd > 0)) ? (storeCustObj.valFtd || 0) : (storeCustObj?.val || 0);
          const customizationTotalBills = (activeTab === "FTD" && (storeCustObj?.valFtd > 0 || storeCustObj?.billsFtd > 0)) ? (storeCustObj.billsFtd || 0) : (storeCustObj?.bills || 0);
          const customizationTotalQty   = (activeTab === "FTD" && (storeCustObj?.valFtd > 0 || storeCustObj?.billsFtd > 0)) ? (storeCustObj.qtyFtd || 0) : (storeCustObj?.qty || 0);

          let allocatedValue = 0;
          let allocatedBills = 0;
          let allocatedQty = 0;

          Object.values(customizationInputs).forEach(v => {
            allocatedValue += Number(v.billWtd) || 0;
            allocatedBills += Number(v.valWtd)  || 0;
            allocatedQty   += Number(v.qtyWtd)  || 0;
          });

          const isOverLimit = customizationTotalValue > 0 && allocatedValue > customizationTotalValue;

          const getInputValue = (inputsObj, staffName, field) => {
            if (!inputsObj || !staffName) return "";
            if (inputsObj[staffName] && inputsObj[staffName][field] !== undefined) {
              return inputsObj[staffName][field];
            }
            const matchedKey = Object.keys(inputsObj).find(k => {
              if (!k) return false;
              if (k.trim().toLowerCase() === staffName.trim().toLowerCase()) return true;
              if (normalizeForMatch(k) === normalizeForMatch(staffName)) return true;
              if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(staffName))) return true;
              if (isStaffNameMatch(k, staffName)) return true;
              return false;
            });
            return matchedKey ? (inputsObj[matchedKey][field] ?? "") : "";
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[6px]" onClick={() => setCustomizationModalOpen(false)} />

              <div className="bg-white rounded-[28px] w-full max-w-[540px] shadow-2xl relative z-10 overflow-hidden border border-gray-100">
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-[15px] font-extrabold text-gray-900 leading-tight">Add Customization</h2>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      Attribute Customization revenue to store staff
                    </p>
                  </div>
                  <button onClick={() => setCustomizationModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
                </div>

                {/* Customization Store Total */}
                <div className="mx-6 mt-4 mb-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Customization Total (this store)</p>
                    <p className="text-[18px] font-extrabold text-emerald-700 mt-0.5">
                      ₹{customizationTotalValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Bills</p>
                      <p className="text-[18px] font-extrabold text-emerald-700">{customizationTotalBills}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Qty</p>
                      <p className="text-[18px] font-extrabold text-emerald-700">{customizationTotalQty}</p>
                    </div>
                  </div>
                </div>

                {/* Allocated so far & Remaining */}
                <div className="mx-6 mb-3 flex gap-2 text-[11px] font-semibold text-gray-500">
                  <span>Allocated: ₹{allocatedValue.toLocaleString()} / {allocatedBills} bills / {allocatedQty} qty</span>
                  <span className="text-gray-300">|</span>
                  <span className={isOverLimit ? "text-red-500 font-bold" : "text-emerald-600"}>
                    Remaining: ₹{(customizationTotalValue - allocatedValue).toLocaleString()}
                  </span>
                </div>

                {/* Over-limit Warning Alert Banner */}
                {isOverLimit && (
                  <div className="mx-6 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center justify-between shadow-sm animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Allocated amount (₹{allocatedValue.toLocaleString()}) exceeds total (₹{customizationTotalValue.toLocaleString()})</span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded-full shrink-0">Exceeded</span>
                  </div>
                )}

                {/* Staff rows */}
                <div className="px-6 pb-2 max-h-[340px] overflow-y-auto space-y-2">
                  {staffList.length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-6">No staff found for this store</p>
                  )}
                  {staffList.map(name => (
                    <div key={name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="flex-1 text-[12px] font-bold text-gray-800 truncate">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Value (₹)</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(customizationInputs, name, "billWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setCustomizationInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), billWtd: val }
                                };
                              });
                            }}
                            className={`w-24 text-center text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isOverLimit ? "border-red-300 focus:border-red-500 bg-red-50/50" : "border-gray-200 focus:border-emerald-400"
                            }`}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Bills</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(customizationInputs, name, "valWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setCustomizationInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), valWtd: val }
                                };
                              });
                            }}
                            className="w-20 text-center text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Qty</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            onWheel={(e) => e.target.blur()}
                            value={getInputValue(customizationInputs, name, "qtyWtd")}
                            onChange={e => {
                              const val = e.target.value;
                              setCustomizationInputs(prev => {
                                const matchedKey = Object.keys(prev).find(k => {
                                  if (!k) return false;
                                  if (k.trim().toLowerCase() === name.trim().toLowerCase()) return true;
                                  if (normalizeForMatch(k) === normalizeForMatch(name)) return true;
                                  if (normalizeForMatch(getCanonicalStaffName(k)) === normalizeForMatch(getCanonicalStaffName(name))) return true;
                                  if (isStaffNameMatch(k, name)) return true;
                                  return false;
                                }) || name;
                                return {
                                  ...prev,
                                  [matchedKey]: { ...(prev[matchedKey] || {}), qtyWtd: val }
                                };
                              });
                            }}
                            className="w-20 text-center text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const cleared = {};
                      staffList.forEach(n => { cleared[n] = { billWtd: "", valWtd: "", qtyWtd: "" }; });
                      setCustomizationInputs(cleared);
                    }}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Clear All
                  </button>
                  <button
                    disabled={isOverLimit}
                    onClick={async () => {
                      if (isOverLimit) {
                        alert("Allocated amount cannot exceed the Customization total.");
                        return;
                      }
                      const saved = {};
                      const attributionsList = [];
                      Object.entries(customizationInputs).forEach(([name, v]) => {
                        const bv = Number(v.billWtd) || 0;
                        const vv = Number(v.valWtd)  || 0;
                        const qv = Number(v.qtyWtd)  || 0;
                        if (bv > 0 || vv > 0 || qv > 0) {
                          saved[name] = { billWtd: bv, valWtd: vv, qtyWtd: qv };
                          attributionsList.push({ staffName: name, billWtd: bv, valWtd: vv, qtyWtd: qv });
                        }
                      });
                      setCustomizationAttribution(saved);
                      localStorage.setItem("customizationAttribution", JSON.stringify(saved));
                      
                      try {
                        const token = localStorage.getItem("token");
                        const targetStore = (isStoreAdmin && branches.length > 0) ? displayBranchName(branches[0].workingBranch) : selectedStore;
                        const targetMonth = activeTab === "Custom" ? getMonthNameFromDateStr(customStartDate) : CURRENT_MONTH_LONG;
                        const targetYear = activeTab === "Custom" ? getYearFromDateStr(customStartDate) : CURRENT_YEAR;

                        await fetch(`${baseUrl.baseUrl}api/customization-attributions`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            storeName: targetStore,
                            month: targetMonth,
                            year: Number(targetYear),
                            week: 1,
                            totalValue: customizationTotalValue,
                            totalBills: customizationTotalBills,
                            totalQuantity: customizationTotalQty,
                            attributions: attributionsList
                          })
                        });
                        await fetchCustomizationAttribution();
                      } catch (err) {
                        console.error("Error saving Customization attribution to MongoDB:", err);
                      }

                      setCustomizationModalOpen(false);
                    }}
                    className={`text-xs font-bold py-2.5 px-6 rounded-xl transition-all ${
                      isOverLimit 
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300 opacity-70" 
                        : "bg-[#10b981] hover:bg-[#059669] text-white cursor-pointer shadow-sm"
                    }`}
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Assign Store Target Modal */}
        {assignTargetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[6px] transition-opacity duration-300"
              onClick={() => setAssignTargetModalOpen(false)}
            />

            {/* Modal Container */}
            <div className="bg-white rounded-[28px] w-full max-w-[560px] shadow-2xl relative z-10 overflow-hidden border border-gray-100">

              {/* Header bar */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAssignTargetModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <FiArrowLeft size={17} className="text-gray-700" />
                  </button>
                  <div>
                    <h2 className="text-[15px] font-extrabold text-gray-900 leading-tight">Assign Target</h2>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {isStoreAdmin
                        ? `Assign staff targets for ${modalStore || (branches[0] ? displayBranchName(branches[0].workingBranch) : "your store")}`
                        : targetAssignMode === "Staff" ? "Set target for a staff member" : "Set target for a store"}
                    </p>
                  </div>
                </div>

                {/* Mode toggle — pill style — hidden for store_admin */}
                {!isStoreAdmin && (
                  <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setTargetAssignMode("Store")}
                      className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 ${
                        targetAssignMode === "Store"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Store
                    </button>
                    <button
                      onClick={() => {
                        if (modalStore === "All") {
                          alert("Staff targets can only be assigned to a specific store. Please select a store first.");
                          return;
                        }
                        setTargetAssignMode("Staff");
                      }}
                      className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 ${
                        targetAssignMode === "Staff"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">

                {/* Store + Month row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Store</label>
                    {isStoreAdmin ? (
                      <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-500 select-none">
                        {modalStore || (branches[0] ? displayBranchName(branches[0].workingBranch) : "—")}
                      </div>
                    ) : (
                      <select
                        value={modalStore}
                        onChange={(e) => {
                          setModalStore(e.target.value);
                          if (e.target.value === "All") setTargetAssignMode("Store");
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black hover:border-gray-300 transition-colors appearance-none"
                      >
                        <option value="">Select store</option>
                        {targetAssignMode === "Store" && <option value="All">All Stores</option>}
                        {storeOptions.filter(o => o !== "All").map((store) => (
                          <option key={store} value={store}>{store}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Month</label>
                    <select
                      value={modalMonth}
                      onChange={(e) => setModalMonth(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black hover:border-gray-300 transition-colors appearance-none"
                    >
                      <option value="">Select month</option>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Staff dropdown — only in Staff mode */}
                {targetAssignMode === "Staff" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Staff Member</label>
                    <select
                      value={modalStaff}
                      onChange={(e) => setModalStaff(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black hover:border-gray-300 transition-colors appearance-none"
                    >
                      <option value="">Select staff member</option>
                      {(() => {
                        if (!modalStore || modalStore === "All") return null;
                        const branch = branches.find(b => displayBranchName(b.workingBranch) === modalStore);
                        if (!branch) return null;
                        const locId = getBranchLocationId(branch.workingBranch);
                        const locCode = branch.locCode || getBranchLocCode(branch.workingBranch, branches);
                        const storeKeyVal = normalizeForMatch(branch.workingBranch);
                        
                        const sysEmpNames = systemEmployees
                          .filter(e => {
                            const b = e?.workingBranch || e?.branch || e?.store;
                            return b && (normalizeForMatch(b) === storeKeyVal || displayBranchName(b) === modalStore || getBranchLocCode(b, branches) === locCode);
                          })
                          .map(e => String(e.name || e.username || "").trim())
                          .filter(Boolean);

                        const rentalNames = (performanceData.period[locId] || []).map(x => x.bookingBy);
                        const squadNames = (performanceData.period["25"] || [])
                          .filter(x => {
                            const raw = String(x.bookingBy || "").trim().toLowerCase();
                            return DAPPR_SQUAD_STORE_MAPPING[raw] === locId || normalizeForMatch(x.bookingBy) === storeKeyVal;
                          })
                          .map(x => x.bookingBy);
                        const salesByStaff = (salesData.period[locCode] || salesData.period[storeKeyVal] || { byStaff: {} }).byStaff || {};
                        const salesNames = Object.keys(salesByStaff);
                        const uniqueNames = deduplicateStaffNames(
                          [...sysEmpNames, ...rentalNames, ...squadNames, ...salesNames],
                          systemEmpNameToCodeMap,
                          systemEmpCodeToNameMap
                        );
                        
                        return uniqueNames.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ));
                      })()}
                    </select>
                  </div>
                )}

                {/* Week selector */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Select Week</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 1, label: "W1", val: modalWeek1 },
                      { id: 2, label: "W2", val: modalWeek2 },
                      { id: 3, label: "W3", val: modalWeek3 },
                      { id: 4, label: "W4", val: modalWeek4 },
                    ].map((w) => {
                      const isActive = activeWeeks.includes(w.id);
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setActiveWeeks([w.id])}
                          className={`relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                            isActive
                              ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                          }`}
                        >
                          <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? "text-white/60" : "text-gray-400"}`}>{w.label}</span>
                          <span className={`text-[10px] font-semibold leading-tight text-center ${isActive ? "text-white" : "text-gray-600"}`}>{w.val}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target balance summary — Staff mode only */}
                {targetAssignMode === "Staff" && modalStore && modalStore !== "All" && activeWeeks.length > 0 && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100">
                    {(() => {
                      const primaryWeek = activeWeeks[0];
                      const stTgt = weeklyTargets[modalStore]?.[primaryWeek] || 0;
                      const allEmpTgt = (employeeTargets[modalStore] || []).reduce(
                        (sum, emp) => sum + (emp.weeklyTargets?.[primaryWeek] || 0), 0
                      );
                      const balance = stTgt - allEmpTgt;
                      const balanceIsOver = balance < 0;
                      return (
                        <div className="grid grid-cols-3 divide-x divide-gray-100">
                          <div className="flex flex-col items-center py-3.5 px-4 bg-gray-50">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Store Target</span>
                            <span className="text-[13px] font-extrabold text-gray-800">₹{formatIndianNumber(stTgt)}</span>
                            <span className="text-[9px] text-gray-400 font-medium mt-0.5">Week {activeWeeks[0]}</span>
                          </div>
                          <div className="flex flex-col items-center py-3.5 px-4 bg-gray-50">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned</span>
                            <span className="text-[13px] font-extrabold text-gray-800">₹{formatIndianNumber(allEmpTgt)}</span>
                            <span className="text-[9px] text-gray-400 font-medium mt-0.5">to staff</span>
                          </div>
                          <div className={`flex flex-col items-center py-3.5 px-4 ${balanceIsOver ? "bg-red-50" : "bg-emerald-50"}`}>
                            <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${balanceIsOver ? "text-red-400" : "text-emerald-500"}`}>Balance</span>
                            <span className={`text-[13px] font-extrabold ${balanceIsOver ? "text-red-600" : "text-emerald-600"}`}>
                              ₹{formatIndianNumber(Math.abs(balance))}
                            </span>
                            <span className={`text-[9px] font-medium mt-0.5 ${balanceIsOver ? "text-red-400" : "text-emerald-500"}`}>
                              {balanceIsOver ? "over-assigned" : "remaining"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Target input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Target Amount (₹)<span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={targetInputRef}
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 500000"
                    value={modalTarget}
                    onChange={(e) => setModalTarget(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-900 placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black hover:border-gray-300 transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                <button
                  onClick={() => {
                    if (!modalStore) { alert("Please select a store to edit."); return; }
                    if (targetAssignMode === "Staff" && !modalStaff) { alert("Please select a staff member to edit."); return; }
                    const primaryWeek = activeWeeks[0];
                    let customVal;
                    if (targetAssignMode === "Staff" && modalStaff) {
                      const empObj = (employeeTargets[modalStore] || []).find(e => e.staffName === modalStaff);
                      customVal = empObj?.weeklyTargets?.[primaryWeek];
                    } else {
                      customVal = weeklyTargets[modalStore]?.[primaryWeek];
                    }
                    setModalTarget(customVal !== undefined ? customVal.toString() : "");
                    setTimeout(() => targetInputRef.current?.focus(), 50);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors px-1"
                >
                  <FiEdit3 size={13} />
                  Load existing value
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setAssignTargetModalOpen(false)}
                    className="px-5 py-2.5 text-[12px] font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!modalStore) { alert("Please select a store."); return; }
                      if (targetAssignMode === "Staff" && !modalStaff) { alert("Please select a staff member."); return; }
                      if (!modalTarget || modalTarget.trim() === "") {
                        alert("Target Amount is required.");
                        targetInputRef.current?.focus();
                        return;
                      }
                      const cleanVal = String(modalTarget || "").replace(/[^0-9.-]/g, "");
                      if (isNaN(Number(cleanVal)) || cleanVal.trim() === "") {
                        alert("Please enter a valid numeric target amount.");
                        targetInputRef.current?.focus();
                        return;
                      }
                      handleSubmitTarget(modalStore, modalTarget, modalMonth);
                    }}
                    className="px-6 py-2.5 text-[12px] font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition-colors shadow-sm"
                  >
                    Save Target
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Configure Week Dates Modal */}
        {configWeeksModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-[4px] transition-opacity duration-300"
              onClick={() => setConfigWeeksModalOpen(false)}
            />

            {/* Modal Container */}
            <div className="bg-white rounded-[24px] w-full max-w-[620px] shadow-2xl relative z-10 p-6 border border-gray-100/50 scale-100 transition-all">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3.5">
                  <button 
                    onClick={() => setConfigWeeksModalOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <FiArrowLeft size={20} className="text-gray-800" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 leading-none">Configure Week Dates</h2>
                </div>
                <button
                  onClick={() => setIsEditingWeeks(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                    isEditingWeeks 
                      ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {isEditingWeeks ? (
                    <>
                      <FiLock size={13} />
                      Lock Dates
                    </>
                  ) : (
                    <>
                      <FiUnlock size={13} />
                      Unlock to Edit
                    </>
                  )}
                </button>
              </div>

              {/* Store Name & Month Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Store Name*</label>
                  {isStoreAdmin ? (
                    <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-500 select-none">
                      {configStore && configStore !== "All" ? configStore : (branches[0] ? displayBranchName(branches[0].workingBranch) : "—")}
                    </div>
                  ) : (
                    <select 
                      value={configStore}
                      onChange={(e) => setConfigStore(e.target.value)}
                      disabled={!isEditingWeeks}
                      className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-black hover:border-gray-300 transition-colors disabled:bg-gray-50/50 disabled:cursor-not-allowed disabled:text-gray-500"
                    >
                      <option value="All">All Stores (Global)</option>
                      {storeOptions.filter(o => o !== "All").map((store) => (
                        <option key={store} value={store}>{store}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Month*</label>
                  <select 
                    value={configMonth}
                    onChange={(e) => setConfigMonth(e.target.value)}
                    disabled={!isEditingWeeks}
                    className="w-full bg-[#fcfcfc] border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-black hover:border-gray-300 transition-colors disabled:bg-gray-50/50 disabled:cursor-not-allowed disabled:text-gray-500"
                  >
                    <option value="">Select Month</option>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Week Date Picker Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { id: 1, label: "Week 1*", val: configWeek1, setVal: setConfigWeek1 },
                  { id: 2, label: "Week 2*", val: configWeek2, setVal: setConfigWeek2 },
                  { id: 3, label: "Week 3*", val: configWeek3, setVal: setConfigWeek3 },
                  { id: 4, label: "Week 4*", val: configWeek4, setVal: setConfigWeek4 }
                ].map((w) => {
                  const isActive = configCalendarOpen === w.id;
                  return (
                    <div key={w.id} className="relative flex flex-col">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{w.label}</label>
                      <div 
                        onClick={() => {
                          if (isEditingWeeks) {
                            setConfigCalendarOpen(configCalendarOpen === w.id ? null : w.id);
                          }
                        }}
                        className={`relative flex items-center justify-between w-full bg-[#fcfcfc] border rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                          !isEditingWeeks
                            ? "border-gray-150 bg-gray-50/50 text-gray-500 cursor-not-allowed opacity-80"
                            : isActive 
                              ? "border-black ring-1 ring-black shadow-[0_0_0_1px_black] text-gray-700 cursor-pointer" 
                              : "border-gray-200 hover:border-gray-400 text-gray-700 cursor-pointer"
                        }`}
                      >
                        <input 
                          type="text"
                          value={w.val}
                          onChange={(e) => w.setVal(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          readOnly={!isEditingWeeks}
                          disabled={!isEditingWeeks}
                          className="bg-transparent border-none outline-none w-full text-xs font-semibold text-gray-700 focus:ring-0 p-0 disabled:text-gray-400"
                        />
                        <FiCalendar size={14} className={`ml-1.5 flex-shrink-0 ${isEditingWeeks ? "text-gray-400" : "text-gray-300"}`} />
                      </div>

                      {/* Custom Scroll Wheel Range Selector Popup */}
                      {configCalendarOpen === w.id && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200/80 rounded-2xl shadow-xl z-30 p-4 w-[260px] select-none text-left">
                          <div className="text-center font-bold text-xs text-gray-800 mb-3 flex justify-between items-center px-1 border-b border-gray-100 pb-2">
                            <span>{configMonth || CURRENT_MONTH_LONG} {CURRENT_YEAR} Picker</span>
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setConfigCalendarOpen(null);
                                }}
                              className="text-gray-400 hover:text-gray-900 text-[10px] font-bold uppercase tracking-wider"
                            >
                              Done
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Start Day Column */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Start Day</span>
                              <div className="h-[150px] overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                {Array.from({ length: getDaysCountInMonth(configMonth || CURRENT_MONTH_LONG) }, (_, i) => i + 1).map((d) => {
                                  const isSelected = configStartDays[w.id] === d;
                                  const isDisabled = false;
                                  return (
                                    <button
                                      key={`start-${d}`}
                                      disabled={isDisabled}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isEditingWeeks) return;
                                        const newStart = d;
                                        let newEnd = configEndDays[w.id];
                                        if (newStart !== null && newEnd !== null && newEnd < newStart) {
                                          newEnd = newStart;
                                        }
                                        setConfigStartDays(prev => ({ ...prev, [w.id]: newStart }));
                                        setConfigEndDays(prev => ({ ...prev, [w.id]: newEnd }));
                                        const monthAbbr = (configMonth || CURRENT_MONTH_LONG).substring(0, 3);
                                        if (newStart !== null && newEnd !== null) {
                                          w.setVal(`${String(newStart).padStart(2, "0")} - ${String(newEnd).padStart(2, "0")} ${monthAbbr}`);
                                        }
                                      }}
                                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors text-center ${
                                        isDisabled
                                          ? "text-gray-300 cursor-not-allowed opacity-40"
                                          : isSelected 
                                            ? "bg-black text-white font-bold" 
                                            : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      {String(d).padStart(2, "0")}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* End Day Column */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">End Day</span>
                              <div className="h-[150px] overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                                {Array.from({ length: getDaysCountInMonth(configMonth || CURRENT_MONTH_LONG) }, (_, i) => i + 1).map((d) => {
                                  const isSelected = configEndDays[w.id] === d;
                                  const isDisabled = configStartDays[w.id] === null || d < configStartDays[w.id];
                                  return (
                                    <button
                                      key={`end-${d}`}
                                      disabled={isDisabled}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isEditingWeeks) return;
                                        const newEnd = d;
                                        setConfigEndDays(prev => ({ ...prev, [w.id]: newEnd }));
                                        const monthAbbr = (configMonth || CURRENT_MONTH_LONG).substring(0, 3);
                                        if (configStartDays[w.id] !== null && newEnd !== null) {
                                          w.setVal(`${String(configStartDays[w.id]).padStart(2, "0")} - ${String(newEnd).padStart(2, "0")} ${monthAbbr}`);
                                        }
                                      }}
                                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors text-center ${
                                        isDisabled 
                                          ? "text-gray-305 cursor-not-allowed opacity-40"
                                          : isSelected 
                                            ? "bg-black text-white font-bold" 
                                            : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      {String(d).padStart(2, "0")}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setConfigWeeksModalOpen(false)}
                  className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 rounded-xl px-5 py-2.5 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveConfigWeeks}
                  className="bg-black hover:bg-black/90 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Dates
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DSRReport;

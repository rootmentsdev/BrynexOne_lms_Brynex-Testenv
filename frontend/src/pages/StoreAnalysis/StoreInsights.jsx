import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../components/SideNav/SideNav";
import ModileNav from "../../components/SideNav/ModileNav";
import WelcomeBanner from "../../components/WelcomeBanner/WelcomeBanner";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { FiDownload } from "react-icons/fi";
import { FaStar, FaStarHalfAlt, FaRegStar, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import baseUrl, { formatStoreDisplayName } from "../../api/api";
import { getHardcodedWalkin } from "../../utils/hardcodedWalkins";

// ── Helpers & Constants ──────────────────────────────────────────────────
const BRAND_TOKENS = new Set(["zorucci", "grooms", "suitor", "guy", "sg"]);

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
  "dappr squad": "25", "dapper squad": "25", "dappr": "25", "dapper": "25", "crsrootments": "25"
};

// Fuzzy normalized lookup: strips all non-alphanumeric chars then matches
const BRANCH_LOCATION_MAPPING_FUZZY = (() => {
  const fuzzy = {};
  Object.entries(BRANCH_LOCATION_MAPPING).forEach(([key, val]) => {
    const stripped = key.replace(/[^a-z0-9]/g, "");
    if (!fuzzy[stripped]) fuzzy[stripped] = val;
  });
  return fuzzy;
})();

function getBranchLocationId(workingBranch) {
  if (!workingBranch) return null;
  const normalized = String(workingBranch).trim().toLowerCase();
  // 1. Exact match
  if (BRANCH_LOCATION_MAPPING[normalized]) return BRANCH_LOCATION_MAPPING[normalized];
  // 2. Fuzzy match: strip all separators/spaces
  const stripped = normalized.replace(/[^a-z0-9]/g, "");
  if (BRANCH_LOCATION_MAPPING_FUZZY[stripped]) return BRANCH_LOCATION_MAPPING_FUZZY[stripped];
  // 3. Keyword-based fallback for common city names
  const CITY_TO_LOC = {
    "edappally": "3", "edapally": "3",
    "trivandrum": "5", "thiruvananthapuram": "5",
    "perinthalmanna": "16", "perinthalmana": "16",
    "kottakkal": "17",
    "kottayam": "9",
    "perumbavoor": "10",
    "thrissur": "11",
    "chavakkad": "12",
    "calicut": "13", "kozhikode": "13",
    "vadakara": "14",
    "edappal": "15",
    "manjeri": "18",
    "palakkad": "19",
    "kalpetta": "20",
    "kannur": "21",
    "mgroad": "23",
  };
  for (const [city, locId] of Object.entries(CITY_TO_LOC)) {
    if (stripped.endsWith(city) || stripped.includes(city)) {
      if (stripped.startsWith("z") || stripped.startsWith("g") || stripped.startsWith("sg") || stripped.startsWith("suitor") || stripped.startsWith("grooms") || stripped.startsWith("zorucci")) {
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("edappal")) return city.includes("edappally") ? "1" : "6";
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("perinthalman")) return "7";
        if ((stripped.startsWith("z") || stripped.startsWith("zorucci")) && city.includes("kottakkal")) return "8";
        return locId;
      }
    }
  }
  return null;
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
  "sg.edapally1": "1"
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

    // 4. Branch location lookup fallback
    if (getBranchLocationId(raw) === locId) return true;
    if (getBranchLocationId(alphaOnly) === locId) return true;

    return false;
  });
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


const fetchWithRetry = async (url, options, retries = 3, backoff = 500, timeoutMs = 25000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const opts = { ...options, signal: controller.signal };

  try {
    const res = await fetch(url, opts);
    clearTimeout(timer);
    if (!res.ok && retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 1.5, timeoutMs);
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 1.5, timeoutMs);
    }
    throw err;
  }
};

const runWithConcurrencyLimit = async (tasks, limit = 4) => {
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

const getPerformanceCached = async (locId, startDate, endDate) => {
  const cacheKey = `perf_${locId}_${startDate}_${endDate}`;
  if (!window.__performanceCache) {
    window.__performanceCache = {};
  }
  
  const cached = window.__performanceCache[cacheKey];
  // Valid cache for 2 minutes
  if (cached) {
    if (cached.data && (Date.now() - (cached.timestamp || 0) < 120000)) {
      return cached.data;
    }
    if (cached.promise) {
      return cached.promise;
    }
  }

  const promise = (async () => {
    try {
      const res = await fetchWithRetry("https://rentalapi.rootments.live/api/Reports/GetPerformanceStaffReportWithCancel", {
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
      }, 3, 500, 25000);
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
      console.warn(`Retry exhausted for getPerformanceCached (loc ${locId}):`, err);
    }
    return [];
  })();

  window.__performanceCache[cacheKey] = {
    promise,
    timestamp: Date.now()
  };

  return promise;
};

const getStoreNameFromLocId = (locId) => {
  const branchKey = Object.keys(BRANCH_LOCATION_MAPPING).find(key => BRANCH_LOCATION_MAPPING[key] === locId);
  if (!branchKey) return "All";
  return displayBranchName(branchKey);
};

function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

const shiftDateYear = (dateStr, years = -1) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return getLocalDateString(d);
};

const SegmentedControl = ({ options, value, onChange }) => {
  return (
    <div className="relative inline-flex items-center bg-[#e5e7eb] dark:bg-gray-800 p-0.5 rounded-full shadow-inner select-none border border-gray-200/60 dark:border-gray-700/50">
      {options.map((opt) => {
        const key = typeof opt === "object" ? opt.key : opt;
        const label = typeof opt === "object" ? opt.label : opt;
        const isActive = value === key;

        return (
          <button
            key={String(key)}
            type="button"
            onClick={() => onChange(key)}
            className={`relative z-10 px-2.5 sm:px-3 py-1 rounded-full text-[10.5px] sm:text-[11px] font-black tracking-wide transition-all duration-250 ease-out cursor-pointer select-none ${
              isActive
                ? "bg-white text-gray-950 shadow-md shadow-black/10 scale-[1.02] border border-black/5 dark:bg-gray-100 dark:text-gray-950"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

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

const getTodayDateHeaderString = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString("en-US", { month: "short" });
  const year = today.getFullYear();
  const weekday = today.toLocaleString("en-US", { weekday: "long" });
  return `${day} ${month} ${year} | ${weekday}`;
};

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

function normalizeForMatch(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/edap{1,3}a?l{1,3}[yi]\d*/g, "edappally")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^sg/, "g")
    .replace(/^dapper/, "dappr");
}

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

// Generate store abbreviation for X-axis labels
function getAbbreviation(fullName) {
  const normName = String(fullName || "").toLowerCase().trim();
  let prefix = "";
  if (normName.includes("zorucci") || normName.startsWith("z-") || normName.startsWith("z.") || normName.startsWith("z ")) {
    prefix = "Z-";
  } else if (normName.includes("suitor guy") || normName.includes("sg") || normName.startsWith("sg-") || normName.startsWith("sg.") || normName.startsWith("sg ") || normName.startsWith("g-") || normName.startsWith("g.") || normName.startsWith("g ") || normName.includes("grooms")) {
    prefix = "SG-";
  }
  
  const clean = fullName
    .replace(/^(zorucci|suitor guy|grooms|sg|g|z)[\.\-\s]*/i, "")
    .replace(/zorucci|suitor guy|grooms|sg|g\s+|z\s+/i, "")
    .trim()
    .toUpperCase();
  
  if (clean.includes("EDAPPALLY") || clean.includes("EDAPALLY")) return prefix + "EDPLY";
  if (clean.includes("EDAPPAL") || clean.includes("EDAPAL")) return prefix + "EDPL";
  if (clean.includes("PERINTHALMANNA") || clean.includes("PERINTHALMANA") || clean.includes("PMA")) return prefix + "PRMNA";
  if (clean.includes("KOTTAKKAL") || clean.includes("KTK")) return prefix + "KTKL";
  if (clean.includes("KOTTAYAM")) return prefix + "KTYM";
  if (clean.includes("PERUMBAVOOR") || clean.includes("PERUMBAVUR")) return prefix + "PBVR";
  if (clean.includes("THRISSUR") || clean.includes("TSR")) return prefix + "TSR";
  if (clean.includes("CHAVAKKAD") || clean.includes("CHAVAKAD")) return prefix + "CVND";
  if (clean.includes("CALICUT") || clean.includes("KOZHIKODE")) return prefix + "CLCT";
  if (clean.includes("VADAKARA")) return prefix + "VDKRA";
  if (clean.includes("PALAKKAD") || clean.includes("PKD")) return prefix + "PLKD";
  if (clean.includes("MANJERI")) return prefix + "MNJRY";
  if (clean.includes("TRIVANDRUM") || clean.includes("THIRUVANANTHAPURAM") || clean.includes("TVM")) return prefix + "TVM";
  if (clean.includes("KALPETTA")) return prefix + "KALPE";
  if (clean.includes("KANNUR") || clean.includes("KNR")) return prefix + "KNR";
  if (clean.includes("MG ROAD") || clean.includes("MGROAD")) return prefix + "MG RO";
  
  return prefix + clean.slice(0, 5);
}

// Sparkline Mock Paths
const sparklineUp = [
  { value: 30 }, { value: 45 }, { value: 40 }, { value: 65 }, { value: 58 }, { value: 85 }
];
const sparklineDown = [
  { value: 85 }, { value: 70 }, { value: 75 }, { value: 50 }, { value: 55 }, { value: 35 }
];

// Reusable Circular Progress Ring SVG matching user design
const CircularProgress = ({ percentage, benchmarkPercentage = 82 }) => {
  const radius = 42;
  const stroke = 6;
  
  // Outer progress ring (thick blue gradient arc)
  const outerRadius = 34;
  const outerCircumference = outerRadius * 2 * Math.PI; // ~213.6
  const maxLen = (280 / 360) * outerCircumference; // limit track to 280 degrees
  const visualPercentage = Math.min(100, Math.max(0, percentage));
  const outerStrokeDashoffset = outerCircumference - (visualPercentage / 100) * maxLen;

  // Inner thin ring (with the benchmark text inside)
  const innerRadius = 20;

  return (
    <div className="relative flex items-center justify-center select-none shrink-0 ml-2">
      <svg height={radius * 2} width={radius * 2}>
        <defs>
          {/* Blue gradient matching the image */}
          <linearGradient id="blueProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d59b3" /> {/* Darker blue */}
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" /> {/* Sky blue */}
          </linearGradient>
        </defs>

        {/* Thick track background (light gray/blue segment) */}
        <circle
          cx={radius}
          cy={radius}
          r={outerRadius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerCircumference - maxLen}
          strokeLinecap="round"
          transform={`rotate(130 ${radius} ${radius})`}
        />

        {/* Thick progress arc (gradient, with rotation matching screenshot) */}
        <circle
          cx={radius}
          cy={radius}
          r={outerRadius}
          fill="none"
          stroke="url(#blueProgressGrad)"
          strokeWidth={stroke}
          strokeDasharray={outerCircumference}
          strokeDashoffset={outerStrokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(130 ${radius} ${radius})`}
          style={{ transition: "stroke-dashoffset 0.6s ease-in-out" }}
        />

        {/* Inner thin benchmark circle */}
        <circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.8"
        />

        {/* Inner text (actual value) */}
        <text
          x={radius}
          y={radius + 3}
          textAnchor="middle"
          className="text-[9px] font-extrabold"
          fill="#1f2937"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {percentage}%
        </text>
      </svg>
    </div>
  );
};

// Reusable Sparkline area matching exact screenshot curve and arrow
const Sparkline = ({ type = "up", color = "#00A36C" }) => {
  const isUp = type === "up";
  
  // Exact path coordinates mapping: scaled horizontally to leave a 15% safety margin on the right
  const linePath = isUp 
    ? "M 0 38 L 20 26 L 36 31 L 51 16 L 69 16 L 85 7" 
    : "M 0 7 L 20 18 L 36 13 L 51 28 L 69 28 L 85 37";
  
  const areaPath = isUp
    ? "M 0 38 L 20 26 L 36 31 L 51 16 L 69 16 L 86 7 L 86 45 L 0 45 Z"
    : "M 0 7 L 20 18 L 36 13 L 51 28 L 69 28 L 86 37 L 86 45 L 0 45 Z";

  const gradId = isUp ? "greenSparklineGrad" : "redSparklineGrad";
  const markerId = isUp ? "arrow-green" : "arrow-red";

  return (
    <div className="h-[45px] w-[70px] sm:w-[80px] lg:w-[65px] xl:w-[75px] 2xl:w-[95px] shrink-0 select-none ml-2 mr-1">
      <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="greenSparklineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00A36C" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#00A36C" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="redSparklineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.0} />
          </linearGradient>
          
          <marker
            id="arrow-green"
            viewBox="0 0 10 10"
            refX="4"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00A36C" />
          </marker>
          <marker
            id="arrow-red"
            viewBox="0 0 10 10"
            refX="4"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#e11d48" />
          </marker>
        </defs>

        {/* Gradient fill area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Trend stroke path */}
        <path 
          d={linePath} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          markerEnd={`url(#${markerId})`} 
        />
      </svg>
    </div>
  );
};

// Helper to render stars rating
const StarRating = ({ rating }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 !== 0;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(<FaStar key={i} className="text-amber-400 text-xs" />);
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(<FaStarHalfAlt key={i} className="text-amber-400 text-xs" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-gray-300 text-xs" />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

// ── Component ────────────────────────────────────────────────────────────
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

const SingleCalendarRangePicker = ({ initialStart, initialEnd, onApply, onClose }) => {
  const parseDateLocal = (str) => {
    if (!str) return new Date();
    if (typeof str !== "string") return new Date(str);
    const parts = str.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
    return new Date(str);
  };

  const [rangeStart, setRangeStart] = useState(initialStart ? parseDateLocal(initialStart) : null);
  const [rangeEnd, setRangeEnd] = useState(initialEnd ? parseDateLocal(initialEnd) : null);
  const [hoverDate, setHoverDate] = useState(null);
  const [viewDate, setViewDate] = useState(initialStart ? parseDateLocal(initialStart) : new Date());

  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const formatLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (d) => {
    if (!d) return "--/--/----";
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const y = d.getFullYear();
    return `${m}/${day}/${y}`;
  };

  const handleDateSelect = (dayNum) => {
    const selected = new Date(year, month, dayNum);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(selected);
      setRangeEnd(null);
    } else if (rangeStart && !rangeEnd) {
      if (selected < rangeStart) {
        setRangeStart(selected);
        setRangeEnd(null);
      } else {
        setRangeEnd(selected);
      }
    }
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isBetween = (d, start, end) => {
    if (!d || !start || !end) return false;
    return d > start && d < end;
  };

  return (
    <div
      ref={calendarRef}
      className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200/90 p-4 w-[310px] sm:w-[330px] font-sans text-gray-800 animate-popoverOpen origin-top-right"
    >
      {/* Month & Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="font-extrabold text-gray-900 text-sm tracking-wide">
          {monthNames[month]} {year}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 mb-2">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`blank-${idx}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const currentDayObj = new Date(year, month, dayNum);

          const isStart = isSameDay(currentDayObj, rangeStart);
          const isEnd = isSameDay(currentDayObj, rangeEnd);
          const effectiveEnd = rangeEnd || (rangeStart && hoverDate && hoverDate >= rangeStart ? hoverDate : null);
          const inRange = isBetween(currentDayObj, rangeStart, effectiveEnd);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleDateSelect(dayNum)}
              onMouseEnter={() => setHoverDate(currentDayObj)}
              className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-[12px] transition-all cursor-pointer
                ${isStart || isEnd
                  ? "bg-black text-white shadow-md scale-105"
                  : inRange
                    ? "bg-gray-100 text-gray-900 rounded-none"
                    : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Selection Summary & Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex flex-col text-[11px]">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Selected Range</span>
          <span className="text-gray-900 font-extrabold text-[11px]">
            {formatDisplayDate(rangeStart)} – {formatDisplayDate(rangeEnd)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!rangeStart || !rangeEnd}
            onClick={() => {
              if (rangeStart && rangeEnd) {
                onApply(formatLocalYYYYMMDD(rangeStart), formatLocalYYYYMMDD(rangeEnd));
              }
            }}
            className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
          >
            Apply Range
          </button>
        </div>
      </div>
    </div>
  );
};

const ALL_STREAMS = [
  { id: "rental", label: "Rental", desc: "Rental bookings & orders", color: "#2563eb", icon: "👔", dot: "#3b82f6", activeBg: "bg-blue-50/80", activeBorder: "border-blue-200" },
  { id: "dappr", label: "Dappr Squad", desc: "POS (Loc 25) & attributions", color: "#8b5cf6", icon: "⚡", dot: "#8b5cf6", activeBg: "bg-purple-50/80", activeBorder: "border-purple-200" },
  { id: "customization", label: "Customization", desc: "Tailoring & customization attributions", color: "#059669", icon: "✂️", dot: "#10b981", activeBg: "bg-emerald-50/80", activeBorder: "border-emerald-200" },
  { id: "shoe", label: "Shoe Sales", desc: "Store product sales", color: "#d97706", icon: "🛍️", dot: "#f59e0b", activeBg: "bg-amber-50/80", activeBorder: "border-amber-200" },
];

const CONSOLIDATED_STREAMS = ["rental", "dappr", "shoe"]; // Consolidated = Rental + Dappr Squad + Shoe Sales (excludes Customization)

const StoreInsights = () => {
  const user = useSelector((state) => state.auth.user);
  const isStoreAdmin = user?.role === "store_admin";
  const isClusterAdmin = user?.role === "cluster_admin";
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin" || (!isStoreAdmin && !isClusterAdmin);

  // Revenue Streams Multi-Selection State (Rental, Dappr Squad, Customization, Shoe Sales)
  const [selectedStreams, setSelectedStreams] = useState(["rental"]); // Default: Rental only
  const [isStreamDropdownOpen, setIsStreamDropdownOpen] = useState(false);
  const streamDropdownRef = useRef(null);

  const includeRental = selectedStreams.includes("rental");
  const includeDappr = selectedStreams.includes("dappr");
  const includeCustomization = selectedStreams.includes("customization");
  const includeShoe = selectedStreams.includes("shoe");
  const isAllStreams = selectedStreams.length === ALL_STREAMS.length;
  const isRentalOnly = selectedStreams.length === 1 && selectedStreams.includes("rental");
  const isConsolidated = selectedStreams.length === CONSOLIDATED_STREAMS.length && CONSOLIDATED_STREAMS.every(s => selectedStreams.includes(s));

  // Page State
  const [timeframe, setTimeframe] = useState("MTD"); // MTD, WTD, YTD, CUSTOM
  const [graphType, setGraphType] = useState("TARGET_VS_ACHIEVED"); // TARGET_VS_ACHIEVED, LY_VS_TY
  const [chartFilter, setChartFilter] = useState("All"); // All, On Track, At Risk
  const [roleFilter, setRoleFilter] = useState("Cluster");
  const [selectedClusters, setSelectedClusters] = useState(["All"]);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState(["All"]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const clusterDropdownRef = useRef(null);
  const storeDropdownRef = useRef(null);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (streamDropdownRef.current && !streamDropdownRef.current.contains(e.target)) {
        setIsStreamDropdownOpen(false);
      }
      if (clusterDropdownRef.current && !clusterDropdownRef.current.contains(e.target)) {
        setIsClusterDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
        setIsStoreDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [clusters, setClusters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rankingSearch, setRankingSearch] = useState("");
  const [rankingSort, setRankingSort] = useState("Best to Least");
  const [rankingPage, setRankingPage] = useState(1);
  
  // Custom Date Picker states
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => getLocalDateString(new Date()));
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Target and performance fetch states
  const [weeklyTargets, setWeeklyTargets] = useState({});
  const [storeWeekRanges, setStoreWeekRanges] = useState({});
  const [employeeTargets, setEmployeeTargets] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [lyPerformanceData, setLyPerformanceData] = useState({});
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [walkins, setWalkins] = useState([]);
  const [lyWalkins, setLyWalkins] = useState([]);
  const [loadingWalkins, setLoadingWalkins] = useState(false);
  const [salesData, setSalesData] = useState({ shoeQty: 0, shirtQty: 0, shoeValue: 0, shirtValue: 0, shoeBills: 0, shirtBills: 0, byBranch: {} });
  const [lySalesData, setLySalesData] = useState({ shoeQty: 0, shirtQty: 0, shoeValue: 0, shirtValue: 0, shoeBills: 0, shirtBills: 0, byBranch: {} });
  const [salespersons, setSalespersons] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Dappr Squad & Customization attributions states
  const [dapprAttribution, setDapprAttribution] = useState({});
  const [customizationAttribution, setCustomizationAttribution] = useState({});
  // Per-store totals keyed by normalizeForMatch(storeName) — used in admin all-stores view
  const [storeDapprTotals, setStoreDapprTotals] = useState({});         // { [normStoreName]: { val, bills, qty } }
  const [storeCustomizationTotals, setStoreCustomizationTotals] = useState({}); // { [normStoreName]: { val, bills, qty } }

  // Google Reviews real data from backend
  const [googleReviewData, setGoogleReviewData] = useState({});
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0.0, totalRatings: 0 });

  // Last refreshed timestamp for real-time indicator
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Dynamic branches state
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch active branches dynamically
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

          // For store_admin/cluster_admin: only show their assigned branches
          if (isStoreAdmin || isClusterAdmin) {
            const assignedBranchIds = new Set((user?.branches || []).map(b => String(b._id || b)));
            const assignedBranchNames = new Set(
              (user?.branches || [])
                .map(b => norm(b.workingBranch || b.name || (typeof b === "string" ? b : "")))
                .filter(Boolean)
            );
            visible = visible.filter(
              (b) =>
                assignedBranchIds.has(String(b._id)) ||
                assignedBranchNames.has(norm(b.workingBranch))
            );
          }

          setBranches([...visible].sort(sortStoresGThenZ));
        }
      } catch (err) {
        console.error("Error fetching branches for Store Insights:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, [isStoreAdmin, isClusterAdmin, user]);

  // Fetch real Google Review counts from backend
  useEffect(() => {
    const fetchGoogleReviews = async () => {
      try {
        const token = localStorage.getItem("token");
        const today = new Date();
        const todayStr = getLocalDateString(today);
        let startStr = todayStr;
        let endStr = todayStr;

        if (timeframe === "WTD") {
          const wtdRange = getStoreWTDDateRange("All");
          startStr = wtdRange.start;
          endStr = wtdRange.end;
        } else if (timeframe === "MTD") {
          startStr = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          endStr = todayStr;
        } else if (timeframe === "YTD") {
          startStr = getLocalDateString(new Date(today.getFullYear(), 0, 1));
          endStr = todayStr;
        } else if (timeframe === "CUSTOM") {
          startStr = customStartDate || todayStr;
          endStr = customEndDate || todayStr;
        }

        let url = `${baseUrl.baseUrl}api/google-reviews/dashboard`;
        if (startStr && endStr) {
          url += `?startDate=${startStr}&endDate=${endStr}`;
        }

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            setGoogleReviewData(json.data);
          }
        }
      } catch (err) {
        console.error("Error fetching Google Reviews dashboard:", err);
      }
    };
    fetchGoogleReviews();
  }, [timeframe, customStartDate, customEndDate]);

  // Fetch branch audit rating summary (staff/store ratings) from backend
  useEffect(() => {
    const fetchRatingSummary = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/branch-audit/staff-rating-summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            setRatingSummary(json.data);
          }
        }
      } catch (err) {
        console.error("Error fetching rating summary in StoreInsights:", err);
      }
    };
    fetchRatingSummary();
  }, []);

  // Fetch active clusters dynamically (by querying admins/employees with role 'cluster_admin')
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/admin/list`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) 
            ? json.data.filter(item => item.role === "cluster_admin") 
            : [];
          setClusters(list);
        }
      } catch (err) {
        console.error("Error fetching cluster admins for Store Insights:", err);
      }
    };
    fetchClusters();
  }, []);

  // Fetch accessible employees dynamically
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/admin/accessible-employees`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setEmployees(Array.isArray(json?.employees) ? json.employees : []);
        }
      } catch (err) {
        console.error("Error fetching employees for Store Insights:", err);
      }
    };
    fetchEmployees();
  }, []);

  const getDaysCountInMonth = (monthName) => {
    const months = {
      January: 31, February: 28, March: 31, April: 30, May: 31, June: 30,
      July: 31, August: 31, September: 30, October: 31, November: 30, December: 31
    };
    return months[monthName] || 30;
  };

  function normalizeForMatch(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/edap{1,3}a?l{1,3}[yi]\d*/g, "edappally")
      .replace(/[^a-z0-9]/g, "")
      .replace(/^sg/, "g")
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
    return str;
  }

  function getStaffChartAbbreviation(fullName, allStaffNames = []) {
    if (!fullName) return "";
    const str = String(fullName).trim();
    const tokens = str.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return str;

    // If first token is a single letter or initial like "M", "S", "A", or "Al" (length <= 2) and second token exists
    let primaryName = tokens[0];
    if (tokens[0].length <= 2 && tokens.length > 1) {
      if (tokens[0].toUpperCase() === "AL" && tokens[1]) {
        primaryName = `Al ${tokens[1]}`; // e.g. "Al Shifna"
      } else {
        primaryName = tokens[1]; // e.g. "M ASHIQ S" -> "Ashiq"
      }
    }

    // Count how many staff in the current view share this primaryName (case-insensitive)
    const matchingStaff = allStaffNames.filter(otherName => {
      if (!otherName) return false;
      const oTokens = String(otherName).trim().split(/\s+/).filter(Boolean);
      const oPrimary = (oTokens[0] && oTokens[0].length <= 2 && oTokens.length > 1) 
        ? (oTokens[0].toUpperCase() === "AL" && oTokens[1] ? `Al ${oTokens[1]}` : oTokens[1])
        : (oTokens[0] || "");
      return oPrimary.toLowerCase() === primaryName.toLowerCase();
    });

    if (matchingStaff.length > 1) {
      // If name starts with Muhammed/Mohammed/etc. and has a second token, use second token to distinguish (e.g. "Ifas", "Swalih")
      if (tokens.length > 1 && tokens[0].toLowerCase().startsWith("muhamm")) {
        return tokens[1];
      }
      if (tokens.length > 1 && tokens[0].toLowerCase().startsWith("mohamm")) {
        return tokens[1];
      }
      // Otherwise append second token or last initial
      if (tokens.length > 1) {
        return `${tokens[0]} ${tokens[1].charAt(0)}.`;
      }
    }

    return primaryName;
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
        const code = empNameToCodeMap?.get?.(getCanonicalStaffName(w.createdBy.name).toLowerCase()) || empNameToCodeMap?.get?.(normalizeForMatch(w.createdBy.name));
        if (code) codes.push(code);
      }
    } else if (typeof w.createdBy === "string" && empNameToCodeMap) {
      const code = empNameToCodeMap?.get?.(getCanonicalStaffName(w.createdBy).toLowerCase()) || empNameToCodeMap?.get?.(normalizeForMatch(w.createdBy));
      if (code) codes.push(code);
    }

    if (w.staffId && typeof w.staffId === "object") {
      [w.staffId.empID, w.staffId.EmpId, w.staffId.employeeId, w.staffId.empCode, w.staffId.emp_code].forEach(val => {
        if (val) codes.push(normalizeEmpCode(val));
      });
    }

    const wStaff = w.staff || w.staffName || w.managerName;
    if (wStaff && empNameToCodeMap) {
      const code = empNameToCodeMap?.get?.(getCanonicalStaffName(wStaff).toLowerCase()) || empNameToCodeMap?.get?.(normalizeForMatch(wStaff));
      if (code) codes.push(code);
    }
    return Array.from(new Set(codes.filter(Boolean)));
  }


  const isDapprSquadName = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase().trim();
    const normalized = lower.replace(/[^a-z0-9]/g, "");
    return lower.startsWith("sg.") || 
           lower.startsWith("sg ") || 
           lower.startsWith("sg-") || 
           lower.startsWith("sg_") || 
           lower.startsWith("z.") || 
           lower.startsWith("z ") || 
           lower.startsWith("z-") || 
           lower.startsWith("z_") || 
           lower === "dappr squad" ||
           lower === "dapper squad" ||
           lower.startsWith("dappr") ||
           lower.startsWith("dapper") ||
           lower === "crsrootments" ||
           lower === "unassigned" ||
           DAPPR_SQUAD_STORE_MAPPING[lower] !== undefined ||
           DAPPR_SQUAD_STORE_MAPPING[normalized] !== undefined ||
           DAPPR_SQUAD_STORE_MAPPING["sg." + normalized.replace(/^sg/, "")] !== undefined ||
           Boolean(getBranchLocationId(lower)) ||
           Boolean(getBranchLocationId(normalized));
  };

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

    const isDapprA = isDapprSquadName(strA);
    const isDapprB = isDapprSquadName(strB);
    if (isDapprA !== isDapprB) return false;

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

  const getStoreWeekRange = (storeName, monthName = CURRENT_MONTH_LONG) => {
    if (!storeName) return null;

    const tryMatch = (name) => {
      if (!name) return null;
      const snorm = name.replace(/[.\-]/g, '-');
      const normKey = normalizeForMatch(name);
      const matchKey = Object.keys(storeWeekRanges).find(
        k => k === name || k === snorm || (normKey && normalizeForMatch(k) === normKey)
      );
      if (matchKey && storeWeekRanges[matchKey]) {
        const storeVal = storeWeekRanges[matchKey];
        if (storeVal[monthName]) {
          const mVal = storeVal[monthName];
          if (mVal[1] || mVal[2] || mVal[3] || mVal[4]) return mVal;
        }
        if (storeVal[1] || storeVal[2] || storeVal[3] || storeVal[4]) return storeVal;
      }
      return null;
    };

    const exactMatch = tryMatch(storeName);
    const allMatch = tryMatch("All");

    if (exactMatch && storeName !== "All") {
      if (allMatch) {
        const exact3 = String(exactMatch[3] || "");
        const all3 = String(allMatch[3] || "");
        if (exact3.includes("15 - 21") && !all3.includes("15 - 21")) {
          return allMatch;
        }
      }
      return exactMatch;
    }

    if (allMatch) return allMatch;
    if (exactMatch) return exactMatch;

    const firstKey = Object.keys(storeWeekRanges)[0];
    if (firstKey && storeWeekRanges[firstKey]) {
      const storeVal = storeWeekRanges[firstKey];
      if (storeVal[monthName]) {
        const mVal = storeVal[monthName];
        if (mVal[1] || mVal[2] || mVal[3] || mVal[4]) return mVal;
      }
      if (storeVal[1] || storeVal[2] || storeVal[3] || storeVal[4]) return storeVal;
    }
    return null;
  };

  const getCurrentWeekId = (storeName = "All", targetMonthName = CURRENT_MONTH_LONG) => {
    const today = new Date();
    const todayDateNum = today.getDate();
    const daysInMonth = getDaysCountInMonth(targetMonthName);
    const daysInMonthStr = String(daysInMonth).padStart(2, "0");
    
    let w1 = `01 - 07 ${CURRENT_MONTH_SHORT}`;
    let w2 = `08 - 14 ${CURRENT_MONTH_SHORT}`;
    let w3 = `15 - 21 ${CURRENT_MONTH_SHORT}`;
    let w4 = `22 - ${daysInMonthStr} ${CURRENT_MONTH_SHORT}`;

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
        else { startDay = 22; endDay = getDaysCountInMonth(targetMonthName); }
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
    
    if (todayDateNum <= 7) return 1;
    if (todayDateNum <= 14) return 2;
    if (todayDateNum <= 21) return 3;
    return 4;
  };

  useEffect(() => {
    const fetchAttributions = async () => {
      const singleStoreName = selectedStores.length === 1 && !selectedStores.includes("All") ? selectedStores[0] : "";
      const activeStore = isStoreAdmin && branches[0] ? displayBranchName(branches[0].workingBranch) : (singleStoreName || (branches[0] ? displayBranchName(branches[0].workingBranch) : ""));
      if (!activeStore && (selectedStores.includes("All") || selectedStores.length === 0) && !isStoreAdmin && branches.length === 0) return;
      try {
        const token = localStorage.getItem("token");
        const startMonth = timeframe === "CUSTOM" ? getMonthNameFromDateStr(customStartDate) : CURRENT_MONTH_LONG;
        const endMonth = timeframe === "CUSTOM" ? getMonthNameFromDateStr(customEndDate || customStartDate) : CURRENT_MONTH_LONG;
        const targetMonth = (timeframe === "CUSTOM" && startMonth !== endMonth) ? "All" : endMonth;
        const startYear = timeframe === "CUSTOM" ? getYearFromDateStr(customStartDate) : CURRENT_YEAR;
        const endYear = timeframe === "CUSTOM" ? getYearFromDateStr(customEndDate || customStartDate) : CURRENT_YEAR;
        const targetYear = (timeframe === "CUSTOM" && startYear !== endYear) ? "All" : endYear;

        // Determine if we need all-store fetch (admin/cluster viewing all)
        const isAllStoresView = !isStoreAdmin && (selectedStores.includes("All") || selectedStores.length === 0);

        if (isAllStoresView) {
          // Fetch Dappr attributions for all stores (no storeName/week filter)
          const dapprRes = await fetch(`${baseUrl.baseUrl}api/dappr-attributions?month=${targetMonth}&year=${targetYear}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const dapprJson = await dapprRes.json();
          const dapprMapped = {};
          const dapprByStore = {}; // { [normStoreName]: { val, bills, qty } }
          if (dapprJson.success && dapprJson.data) {
            const docs = Array.isArray(dapprJson.data) ? dapprJson.data : [dapprJson.data];
            docs.forEach(doc => {
              if (!doc?.storeName) return;
              const storeKey = normalizeForMatch(doc.storeName);
              if (!dapprByStore[storeKey]) dapprByStore[storeKey] = { val: 0, bills: 0, qty: 0 };
              (doc.attributions || []).forEach(attr => {
                if (!attr?.staffName) return;
                const bv = Number(attr.billWtd) || 0;
                const vv = Number(attr.valWtd) || 0;
                const qv = Number(attr.qtyWtd) || 0;
                dapprMapped[attr.staffName] = {
                  billWtd: (dapprMapped[attr.staffName]?.billWtd || 0) + bv,
                  valWtd:  (dapprMapped[attr.staffName]?.valWtd  || 0) + vv,
                  qtyWtd:  (dapprMapped[attr.staffName]?.qtyWtd  || 0) + qv,
                };
                dapprByStore[storeKey].val   += bv;
                dapprByStore[storeKey].bills += vv;
                dapprByStore[storeKey].qty   += qv;
              });
            });
          }
          setDapprAttribution(dapprMapped);
          setStoreDapprTotals(dapprByStore);

          // Fetch Customization attributions for all stores
          const custRes = await fetch(`${baseUrl.baseUrl}api/customization-attributions?month=${targetMonth}&year=${targetYear}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const custJson = await custRes.json();
          const custMapped = {};
          const custByStore = {}; // { [normStoreName]: { val, bills, qty } }
          if (custJson.success && custJson.data) {
            const docs = Array.isArray(custJson.data) ? custJson.data : [custJson.data];
            docs.forEach(doc => {
              if (!doc?.storeName) return;
              const rawKey = normalizeForMatch(doc.storeName);
              const dispKey = normalizeForMatch(displayBranchName(doc.storeName));
              const edapKey = rawKey.replace(/edappally/g, "edapally");
              const dispEdapKey = dispKey.replace(/edappally/g, "edapally");
              const keysToAdd = Array.from(new Set([rawKey, dispKey, edapKey, dispEdapKey])).filter(Boolean);

              keysToAdd.forEach(k => {
                if (!custByStore[k]) custByStore[k] = { val: 0, bills: 0, qty: 0 };
              });

              let valAdd = Number(doc.totalValue) || 0;
              let billsAdd = Number(doc.totalBills) || 0;
              let qtyAdd = Number(doc.totalQuantity) || 0;

              if (doc.attributions && doc.attributions.length > 0) {
                doc.attributions.forEach(attr => {
                  if (!attr?.staffName) return;
                  const bv = Number(attr.billWtd) || 0;
                  const vv = Number(attr.valWtd) || 0;
                  const qv = Number(attr.qtyWtd) || 0;

                  custMapped[attr.staffName] = {
                    billWtd: (custMapped[attr.staffName]?.billWtd || 0) + bv,
                    valWtd:  (custMapped[attr.staffName]?.valWtd  || 0) + vv,
                    qtyWtd:  (custMapped[attr.staffName]?.qtyWtd  || 0) + qv,
                  };

                  if (!valAdd && !billsAdd && !qtyAdd) {
                    valAdd += bv;
                    billsAdd += vv;
                    qtyAdd += qv;
                  }
                });
              }

              keysToAdd.forEach(k => {
                custByStore[k].val   += valAdd;
                custByStore[k].bills += billsAdd;
                custByStore[k].qty   += qtyAdd;
              });
            });
          }
          setCustomizationAttribution(custMapped);
          setStoreCustomizationTotals(custByStore);
        } else {
          // Fetch Dappr attributions (single store)
          let dapprUrl = `${baseUrl.baseUrl}api/dappr-attributions?storeName=${encodeURIComponent(activeStore)}&month=${targetMonth}&year=${targetYear}`;
          if (timeframe === "WTD") {
            const currentWeek = getCurrentWeekId(activeStore, targetMonth) || 1;
            dapprUrl += `&week=${currentWeek}`;
          }

          const dapprRes = await fetch(dapprUrl, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const dapprJson = await dapprRes.json();
          const mapped = {};
          const dapprByStore = {};
          const storeKey = normalizeForMatch(activeStore);
          dapprByStore[storeKey] = { val: 0, bills: 0, qty: 0 };

          if (dapprJson.success && dapprJson.data) {
            const docs = Array.isArray(dapprJson.data) ? dapprJson.data : [dapprJson.data];
            docs.forEach(doc => {
              (doc.attributions || []).forEach(attr => {
                if (!attr?.staffName) return;
                const bv = Number(attr.billWtd) || 0;
                const vv = Number(attr.valWtd) || 0;
                const qv = Number(attr.qtyWtd) || 0;
                mapped[attr.staffName] = {
                  billWtd: (mapped[attr.staffName]?.billWtd || 0) + bv,
                  valWtd:  (mapped[attr.staffName]?.valWtd  || 0) + vv,
                  qtyWtd:  (mapped[attr.staffName]?.qtyWtd  || 0) + qv,
                };
                dapprByStore[storeKey].val   += bv;
                dapprByStore[storeKey].bills += vv;
                dapprByStore[storeKey].qty   += qv;
              });
            });
            setDapprAttribution(mapped);
            setStoreDapprTotals(dapprByStore);
          } else {
            setDapprAttribution({});
            setStoreDapprTotals(dapprByStore);
          }

          // Fetch Customization attributions (single store)
          let custUrl = `${baseUrl.baseUrl}api/customization-attributions?storeName=${encodeURIComponent(activeStore)}&month=${targetMonth}&year=${targetYear}`;
          if (timeframe === "WTD") {
            const currentWeek = getCurrentWeekId(activeStore, targetMonth) || 1;
            custUrl += `&week=${currentWeek}`;
          }

          const custRes = await fetch(custUrl, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const custJson = await custRes.json();
          const custMapped = {};
          const custByStore = {};
          custByStore[storeKey] = { val: 0, bills: 0, qty: 0 };

          if (custJson.success && custJson.data) {
            const docs = Array.isArray(custJson.data) ? custJson.data : [custJson.data];
            docs.forEach(doc => {
              const rawKey = normalizeForMatch(doc.storeName || activeStore);
              const dispKey = normalizeForMatch(displayBranchName(doc.storeName || activeStore));
              const edapKey = rawKey.replace(/edappally/g, "edapally");
              const dispEdapKey = dispKey.replace(/edappally/g, "edapally");
              const keysToAdd = Array.from(new Set([rawKey, dispKey, edapKey, dispEdapKey, storeKey])).filter(Boolean);

              keysToAdd.forEach(k => {
                if (!custByStore[k]) custByStore[k] = { val: 0, bills: 0, qty: 0 };
              });

              let valAdd = Number(doc.totalValue) || 0;
              let billsAdd = Number(doc.totalBills) || 0;
              let qtyAdd = Number(doc.totalQuantity) || 0;

              if (doc.attributions && doc.attributions.length > 0) {
                doc.attributions.forEach(attr => {
                  if (!attr?.staffName) return;
                  const bv = Number(attr.billWtd) || 0;
                  const vv = Number(attr.valWtd) || 0;
                  const qv = Number(attr.qtyWtd) || 0;

                  custMapped[attr.staffName] = {
                    billWtd: (custMapped[attr.staffName]?.billWtd || 0) + bv,
                    valWtd:  (custMapped[attr.staffName]?.valWtd  || 0) + vv,
                    qtyWtd:  (custMapped[attr.staffName]?.qtyWtd  || 0) + qv,
                  };

                  if (!valAdd && !billsAdd && !qtyAdd) {
                    valAdd += bv;
                    billsAdd += vv;
                    qtyAdd += qv;
                  }
                });
              }

              keysToAdd.forEach(k => {
                custByStore[k].val   += valAdd;
                custByStore[k].bills += billsAdd;
                custByStore[k].qty   += qtyAdd;
              });
            });
            setCustomizationAttribution(custMapped);
            setStoreCustomizationTotals(custByStore);
          } else {
            setCustomizationAttribution({});
            setStoreCustomizationTotals(custByStore);
          }
        }
      } catch (err) {
        console.error("Error fetching attributions in StoreInsights:", err);
      }
    };

    fetchAttributions();
  }, [branches, isStoreAdmin, selectedStores, timeframe, customStartDate]);

  const getCustomRangeTarget = (storeName, startDateStr, endDateStr, targetMonthName, overrideTargetObj = null) => {
    if (!startDateStr || !endDateStr) return 0;
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const targetMonth = start.getMonth();
    
    const daysInMonth = getDaysCountInMonth(targetMonthName);
    const daysInMonthStr = String(daysInMonth).padStart(2, "0");
    
    let w1 = `01 - 07 ${CURRENT_MONTH_SHORT}`;
    let w2 = `08 - 14 ${CURRENT_MONTH_SHORT}`;
    let w3 = `15 - 21 ${CURRENT_MONTH_SHORT}`;
    let w4 = `22 - ${daysInMonthStr} ${CURRENT_MONTH_SHORT}`;
    
    if (storeName !== "All") {
      const sr = getStoreWeekRange(storeName, targetMonthName);
      if (sr) {
        if (sr[1]) w1 = sr[1];
        if (sr[2]) w2 = sr[2];
        if (sr[3]) w3 = sr[3];
        if (sr[4]) w4 = sr[4];
      }
    }
    
    const parseRange0 = (val, weekId) => {
      let { start: startDay, end: endDay } = parseWeekDays(val);
      if (startDay === null || endDay === null || isNaN(startDay) || isNaN(endDay)) {
        if (weekId === 1) { startDay = 1; endDay = 7; }
        else if (weekId === 2) { startDay = 8; endDay = 14; }
        else if (weekId === 3) { startDay = 15; endDay = 21; }
        else { startDay = 22; endDay = getDaysCountInMonth(targetMonthName); }
      }
      return { startDay, endDay, count: (endDay - startDay + 1) };
    };

    const wRanges0 = {
      1: parseRange0(w1, 1),
      2: parseRange0(w2, 2),
      3: parseRange0(w3, 3),
      4: parseRange0(w4, 4),
    };

    const tgtObj0 = overrideTargetObj || getStoreWeeklyTargetsObj(storeName, targetMonthName);
    let totalTarget0 = 0;
    let temp0 = new Date(start);
    while (temp0 <= end) {
      const dayNum0 = temp0.getDate();
      const tempMonth0 = temp0.getMonth();
      if (tempMonth0 === targetMonth) {
        let foundWeekId0 = null;
        for (let wId = 1; wId <= 4; wId++) {
          const r = wRanges0[wId];
          if (dayNum0 >= r.startDay && dayNum0 <= r.endDay) { foundWeekId0 = wId; break; }
        }
        if (foundWeekId0) {
          const tw = tgtObj0[foundWeekId0] || tgtObj0[String(foundWeekId0)] || 0;
          totalTarget0 += tw / (wRanges0[foundWeekId0].count || 7);
        }
      }
      temp0.setDate(temp0.getDate() + 1);
    }
    return Math.round(totalTarget0);
  };

  const getStoreWeeklyTargetsObj = (storeName, targetMonthName = CURRENT_MONTH_LONG) => {
    if (!storeName) return {};
    const normKey = normalizeForMatch(storeName);
    const snorm = storeName.replace(/[.\-]/g, '-');
    const dispName = displayBranchName(storeName);

    const keysToTry = Array.from(new Set([storeName, dispName, snorm, normKey].filter(Boolean)));
    for (const k of keysToTry) {
      const monthObj = weeklyTargets[k];
      if (monthObj && monthObj[targetMonthName] && [1, 2, 3, 4].some(w => Number(monthObj[targetMonthName][w] || 0) > 0)) {
        return monthObj[targetMonthName];
      }
      if (monthObj && (monthObj[1] || monthObj[2] || monthObj[3] || monthObj[4])) {
        return monthObj;
      }
    }

    const matchingKeys = Object.keys(weeklyTargets).filter(
      k => k === storeName || k === snorm || (normKey && normalizeForMatch(k) === normKey)
    );
    if (matchingKeys.length === 0) return {};

    const keyWithTargets = matchingKeys.find(k => {
      const mObj = weeklyTargets[k];
      const targetObj = (mObj && mObj[targetMonthName]) ? mObj[targetMonthName] : mObj;
      return targetObj && [1, 2, 3, 4].some(w => Number(targetObj[w] || 0) > 0);
    });

    const finalKey = keyWithTargets || matchingKeys[0];
    const monthObj = weeklyTargets[finalKey];
    if (monthObj && monthObj[targetMonthName]) return monthObj[targetMonthName];
    return monthObj || {};
  };

  const getTargetForRange = (storeName, start, end, targetMonthName = CURRENT_MONTH_LONG, overrideTargetObj = null) => {
    if (!start || !end) return 0;
    const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const targetMonthIndex = MONTH_NAMES.indexOf(targetMonthName);
    const targetYearNum = start.getFullYear();
    const targetMonth = targetMonthIndex !== -1 ? targetMonthIndex : new Date().getMonth();

    const weekRangesObj = getStoreWeekRange(storeName, targetMonthName);
    // getStoreWeekRange returns { 1: "...", 2: "...", 3: "...", 4: "..." }
    const w1 = (weekRangesObj && weekRangesObj[1]) ? weekRangesObj[1] : `01 - 07 ${targetMonthName.slice(0, 3)}`;
    const w2 = (weekRangesObj && weekRangesObj[2]) ? weekRangesObj[2] : `08 - 14 ${targetMonthName.slice(0, 3)}`;
    const w3 = (weekRangesObj && weekRangesObj[3]) ? weekRangesObj[3] : `15 - 21 ${targetMonthName.slice(0, 3)}`;
    const w4 = (weekRangesObj && weekRangesObj[4]) ? weekRangesObj[4] : `22 - ${getDaysCountInMonth(targetMonthName, targetYearNum)} ${targetMonthName.slice(0, 3)}`;

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
    const storeTargetObj = overrideTargetObj || getStoreWeeklyTargetsObj(storeName, targetMonthName);
    let totalTarget = 0;
    let temp = new Date(start);
    while (temp <= end) {
      const dayNum = temp.getDate();
      const tempMonth = temp.getMonth();
      if (tempMonth === targetMonth) {
        let foundWeekId = null;
        for (let wId = 1; wId <= 4; wId++) {
          const r = wRanges[wId];
          if (dayNum >= r.startDay && dayNum <= r.endDay) { foundWeekId = wId; break; }
        }
        if (foundWeekId) {
          const targetW = storeTargetObj[foundWeekId] || storeTargetObj[String(foundWeekId)] || 0;
          totalTarget += targetW / (wRanges[foundWeekId].count || 7);
        }
      }
      temp.setDate(temp.getDate() + 1);
    }
    return Math.round(totalTarget);
  };

  const getStoreTarget = (storeName, defaultTarget, activeTabVal, customFactorVal, targetMonthName = CURRENT_MONTH_LONG) => {
    const storeTargetObj = getStoreWeeklyTargetsObj(storeName, targetMonthName);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (activeTabVal === "MTD") {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = getDaysCountInMonth(targetMonthName, currentYear);
      const monthEnd = new Date(currentYear, currentMonth, lastDayOfMonth);
      const endDate = today > monthEnd ? monthEnd : (today < monthStart ? monthStart : today);
      const hasAnyWeekTarget = [1, 2, 3, 4].some(wId => {
        const v = storeTargetObj[wId] !== undefined ? storeTargetObj[wId] : storeTargetObj[String(wId)];
        return v !== undefined && Number(v) > 0;
      });
      if (!hasAnyWeekTarget && defaultTarget) {
        const elapsedDays = Math.max(1, Math.min(lastDayOfMonth, today.getDate()));
        return Math.round((defaultTarget / lastDayOfMonth) * elapsedDays);
      }
      if (!hasAnyWeekTarget) return 0;
      return getTargetForRange(storeName, monthStart, endDate, targetMonthName);
    }
    
    if (activeTabVal === "WTD") {
      const currentWeekId = getCurrentWeekId(storeName, targetMonthName);
      const weekRangesObj = getStoreWeekRange(storeName, targetMonthName);

      let activeWeekRangeStr = weekRangesObj ? (weekRangesObj[currentWeekId] || weekRangesObj[String(currentWeekId)]) : null;
      if (!activeWeekRangeStr || activeWeekRangeStr === "Select Days") {
        const daysInMonth = getDaysCountInMonth(targetMonthName, currentYear);
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
          return getTargetForRange(storeName, weekStart, endDate, targetMonthName);
        }
      }

      const val = storeTargetObj[currentWeekId] !== undefined ? storeTargetObj[currentWeekId] : storeTargetObj[String(currentWeekId)];
      const fullWTarget = (val !== undefined && val !== null) ? Number(val) : (defaultTarget ? Math.round(defaultTarget * 0.23) : 0);
      if (fullWTarget === 0) return 0;
      const startDayFallback = currentWeekId === 1 ? 1 : (currentWeekId === 2 ? 8 : (currentWeekId === 3 ? 15 : 22));
      const elapsedDays = Math.max(1, Math.min(7, today.getDate() - startDayFallback + 1));
      return Math.round((fullWTarget / 7) * elapsedDays);
    }

    if (activeTabVal === "CUSTOM") {
      return getCustomRangeTarget(storeName, customStartDate, customEndDate, targetMonthName);
    }
    
    return defaultTarget;
  };

  const getYTDStoreTarget = (storeName) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const today = new Date();
    const currentMonthIdx = today.getMonth(); // 0 to 11
    
    let sum = 0;
    for (let i = 0; i <= currentMonthIdx; i++) {
      const monthName = monthNames[i];
      sum += getStoreTarget(storeName, 0, "MTD", 1.0, monthName);
    }
    return sum;
  };

  const getStoreWTDDateRange = (storeName = "All") => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const todayDateNum = today.getDate();
    
    const activeWeekId = getCurrentWeekId(storeName);
    const monthName = CURRENT_MONTH_LONG;
    
    const daysInMonth = getDaysCountInMonth(monthName);
    const daysInMonthStr = String(daysInMonth).padStart(2, "0");
    let w1 = `01 - 07 ${CURRENT_MONTH_SHORT}`;
    let w2 = `08 - 14 ${CURRENT_MONTH_SHORT}`;
    let w3 = `15 - 21 ${CURRENT_MONTH_SHORT}`;
    let w4 = `22 - ${daysInMonthStr} ${CURRENT_MONTH_SHORT}`;

    if (storeName !== "All") {
      const sr = getStoreWeekRange(storeName, monthName);
      if (sr) {
        if (sr[1]) w1 = sr[1];
        if (sr[2]) w2 = sr[2];
        if (sr[3]) w3 = sr[3];
        if (sr[4]) w4 = sr[4];
      }
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

  const getMTDDateRangeString = () => {
    const today = new Date();
    const monthName = today.toLocaleString("en-US", { month: "long" });
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    return `${monthName} 01-${day}, ${year}`;
  };

  const getWTDDateRangeString = () => {
    const today = new Date();
    const activeStore = isStoreAdmin && branches[0] ? displayBranchName(branches[0].workingBranch) : (selectedStores.length === 1 && !selectedStores.includes("All") ? selectedStores[0] : "All");
    const wtdRange = getStoreWTDDateRange(activeStore || "All");
    const startDate = new Date(wtdRange.start);
    const startMonth = startDate.toLocaleString("en-US", { month: "long" });
    const startDay = String(startDate.getDate()).padStart(2, "0");
    const endDay = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    if (startDate.getMonth() === today.getMonth()) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    }
    const endMonth = today.toLocaleString("en-US", { month: "long" });
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  const getYTDDateRangeString = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const monthName = today.toLocaleString("en-US", { month: "long" });
    return `January 01 - ${monthName} ${day}, ${today.getFullYear()}`;
  };

  const getCustomDateRangeString = () => {
    if (!customStartDate || !customEndDate) return "Custom Range";
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
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

  const today = new Date();
  const todayStr = getLocalDateString(today);
  
  let periodStart = todayStr;
  let periodEnd = todayStr;
  if (timeframe === "WTD") {
    const wtdRange = getStoreWTDDateRange("All");
    periodStart = wtdRange.start;
    periodEnd = wtdRange.end;
  } else if (timeframe === "MTD") {
    periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
    periodEnd = todayStr;
  } else if (timeframe === "YTD") {
    periodStart = getLocalDateString(new Date(today.getFullYear(), 0, 1));
    periodEnd = todayStr;
  } else if (timeframe === "CUSTOM") {
    periodStart = customStartDate || todayStr;
    periodEnd = customEndDate || todayStr;
  }

  const lyPeriodStart = shiftDateYear(periodStart, -1);
  const lyPeriodEnd = shiftDateYear(periodEnd, -1);

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
        console.error("Error fetching system employees in StoreInsights:", err);
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

  // Fetch targets once on mount for the current year
  useEffect(() => {
    const fetchTargets = async () => {
      setLoadingTargets(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${baseUrl.baseUrl}api/store-targets?year=${CURRENT_YEAR}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          
          const targetsMap = {};
          const rangesMap = {};
          const empTargetsMap = {};
          const sortedList = [...list].sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0));

          sortedList.forEach((t) => {
            const store = t.storeName;
            const storeNorm = store.replace(/[.\-]/g, '-');
            const normKey = normalizeForMatch(store);
            const dispName = displayBranchName(store);
            const matchingBranch = branches.find(b => displayBranchName(b.workingBranch) === store || b.workingBranch === store || normalizeForMatch(b.workingBranch) === normKey);
            const branchWorking = matchingBranch ? matchingBranch.workingBranch : null;
            const allStoreAliases = Array.from(new Set([store, dispName, branchWorking, storeNorm, normKey].filter(Boolean)));
            const month = t.month;

            allStoreAliases.forEach(aliasKey => {
              if (!targetsMap[aliasKey]) targetsMap[aliasKey] = {};
              if (!rangesMap[aliasKey]) rangesMap[aliasKey] = {};
              
              const existingTarget = targetsMap[aliasKey][month];
              const hasNewTargets = [1, 2, 3, 4].some(w => Number(t.weeklyTargets?.[w] || 0) > 0);
              if (!existingTarget || hasNewTargets) {
                targetsMap[aliasKey][month] = t.weeklyTargets || {};
                rangesMap[aliasKey][month] = t.weekRanges || {};
                rangesMap[aliasKey] = { ...rangesMap[aliasKey], ...(t.weekRanges || {}) };
              }

              if (t.employeeTargets && t.employeeTargets.length > 0) {
                if (!empTargetsMap[aliasKey]) empTargetsMap[aliasKey] = {};
                empTargetsMap[aliasKey][month] = t.employeeTargets;
              }
            });
          });
          setWeeklyTargets(targetsMap);
          setStoreWeekRanges(rangesMap);
          setEmployeeTargets(empTargetsMap);
        }
      } catch (err) {
        console.error("Error fetching targets in StoreInsights:", err);
      } finally {
        setLoadingTargets(false);
      }
    };
    fetchTargets();
  }, []);

  // Fetch performance whenever timeframe or custom dates or branches list changes
  useEffect(() => {
    const fetchPerformance = async () => {
      setLoadingPerformance(true);
      try {
        const today = new Date();
        const todayStr = getLocalDateString(today);
        
        let periodStart = todayStr;
        let periodEnd = todayStr;
        
        if (timeframe === "WTD") {
          const wtdRange = getStoreWTDDateRange("All");
          periodStart = wtdRange.start;
          periodEnd = wtdRange.end;
        } else if (timeframe === "MTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (timeframe === "YTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), 0, 1));
          periodEnd = todayStr;
        } else if (timeframe === "CUSTOM") {
          periodStart = customStartDate || todayStr;
          periodEnd = customEndDate || todayStr;
        }

        const allLocationIds = ["1", "3", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "23", "25"];

        // Scope location IDs for store_admin and cluster_admin to only their assigned branches (+ Dappr loc 25)
        let locationIds = allLocationIds;
        if (isStoreAdmin || isClusterAdmin) {
          const targetBranches = branches.length > 0 ? branches : (user?.branches || []);
          const assignedLocIds = targetBranches.map(b => getBranchLocationId(b?.workingBranch || b)).filter(Boolean);
          assignedLocIds.push("25");
          if (assignedLocIds.length > 0) {
            locationIds = Array.from(new Set(assignedLocIds));
          }
        }

        const getStoreNameFromLocId = (locId) => {
          const foundBranch = branches.find(b => getBranchLocationId(b.workingBranch) === locId);
          if (foundBranch) return displayBranchName(foundBranch.workingBranch);
          const branchKey = Object.keys(BRANCH_LOCATION_MAPPING).find(key => BRANCH_LOCATION_MAPPING[key] === locId);
          if (!branchKey) return "All";
          return displayBranchName(branchKey);
        };

        const tasks = locationIds.map((locId) => async () => {
          let storePeriodStart = periodStart;
          let storePeriodEnd = periodEnd;
          
          if (timeframe === "WTD") {
            const storeName = getStoreNameFromLocId(locId);
            const wtdRange = getStoreWTDDateRange(storeName);
            storePeriodStart = wtdRange.start;
            storePeriodEnd = wtdRange.end;
          }

          const data = await getPerformanceCached(locId, storePeriodStart, storePeriodEnd);
          return { locId, data };
        });

        const results = await runWithConcurrencyLimit(tasks, 4);
        const map = {};
        results.forEach(r => {
          map[r.locId] = r.data;
        });
        setPerformanceData(map);
        setLoadingPerformance(false);
        setLastRefreshed(new Date());

        // Fetch last year performance data shifted by exactly 1 year in background
        const shiftDateYear = (dateStr, years = -1) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "";
          d.setFullYear(d.getFullYear() + years);
          return getLocalDateString(d);
        };
        const lyPeriodStart = shiftDateYear(periodStart, -1);
        const lyPeriodEnd = shiftDateYear(periodEnd, -1);

        const lyTasks = locationIds.map((locId) => async () => {
          let storePeriodStart = lyPeriodStart;
          let storePeriodEnd = lyPeriodEnd;
          
          if (timeframe === "WTD") {
            const storeName = getStoreNameFromLocId(locId);
            const wtdRange = getStoreWTDDateRange(storeName);
            storePeriodStart = shiftDateYear(wtdRange.start, -1);
            storePeriodEnd = shiftDateYear(wtdRange.end, -1);
          }

          const data = await getPerformanceCached(locId, storePeriodStart, storePeriodEnd);
          return { locId, data };
        });

        runWithConcurrencyLimit(lyTasks, 3).then(lyResults => {
          const lyMap = {};
          lyResults.forEach(r => {
            lyMap[r.locId] = r.data;
          });
          setLyPerformanceData(lyMap);
        }).catch(err => {
          console.warn("LY background fetch error:", err);
        });

      } catch (err) {
        console.error("Error in fetchPerformance for StoreInsights:", err);
        setLoadingPerformance(false);
      }
    };

    fetchPerformance();

    // Auto-refresh every 5 minutes for real-time data
    // Silent refresh — no loading spinner so the UI doesn't flicker
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
    const silentRefresh = async () => {
      // Clear the performance cache so stale entries don't block fresh data
      window.__performanceCache = {};
      try {
        await fetchPerformance();
      } catch {
        // Silently ignore — data stays as-is until next cycle
      }
    };
    const intervalId = setInterval(silentRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [timeframe, customStartDate, customEndDate, branches, storeWeekRanges, selectedStreams]);

  // Fetch walkins dynamically based on timeframe range
  useEffect(() => {
    const fetchWalkins = async () => {
      setLoadingWalkins(true);
      try {
        const token = localStorage.getItem("token");
        const today = new Date();
        const todayStr = getLocalDateString(today);
        
        let periodStart = todayStr;
        let periodEnd = todayStr;
        if (timeframe === "WTD") {
          const wtdRange = getStoreWTDDateRange("All");
          periodStart = wtdRange.start;
          periodEnd = wtdRange.end;
        } else if (timeframe === "MTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (timeframe === "YTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), 0, 1));
          periodEnd = todayStr;
        } else if (timeframe === "CUSTOM") {
          periodStart = customStartDate || todayStr;
          periodEnd = customEndDate || todayStr;
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

        // Fetch last year walkins
        const shiftDateYear = (dateStr, years = -1) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "";
          d.setFullYear(d.getFullYear() + years);
          return getLocalDateString(d);
        };
        const lyFetchStart = shiftDateYear(fetchStart, -1);
        const lyFetchEnd = shiftDateYear(fetchEnd, -1);

        const lyRes = await fetch(`${baseUrl.baseUrl}api/walkin/list?startDate=${lyFetchStart}&endDate=${lyFetchEnd}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (lyRes.ok) {
          const json = await lyRes.json();
          const list = Array.isArray(json?.data) ? json.data : [];
          setLyWalkins(list);
        }
      } catch (err) {
        console.error("Error fetching walkins for StoreInsights:", err);
      } finally {
        setLoadingWalkins(false);
      }
    };
    fetchWalkins();

    // Auto-refresh walkins every 5 minutes
    const intervalId = setInterval(() => { fetchWalkins(); }, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [timeframe, customStartDate, customEndDate]);

  // Fetch Shoe & Shirt sales from brynex summary API
  useEffect(() => {
    if (branches.length === 0) return;
    const fetchSales = async () => {
      setLoadingSales(true);
      try {
        const today = new Date();
        const todayStr = getLocalDateString(today);
        let periodStart = todayStr;
        let periodEnd = todayStr;
        if (timeframe === "WTD") {
          const wtdRange = getStoreWTDDateRange("All");
          periodStart = wtdRange.start;
          periodEnd = wtdRange.end;
        } else if (timeframe === "MTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
          periodEnd = todayStr;
        } else if (timeframe === "YTD") {
          periodStart = getLocalDateString(new Date(today.getFullYear(), 0, 1));
          periodEnd = todayStr;
        } else if (timeframe === "CUSTOM") {
          periodStart = customStartDate || todayStr;
          periodEnd = customEndDate || todayStr;
        }

        const shiftDateYear = (dateStr, years = -1) => {
          if (!dateStr) return "";
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "";
          d.setFullYear(d.getFullYear() + years);
          return getLocalDateString(d);
        };
        const lyPeriodStart = shiftDateYear(periodStart, -1);
        const lyPeriodEnd = shiftDateYear(periodEnd, -1);

        // Fetch summary, salesperson lists, and last year summary in parallel
        const [res, resSalespersons, lyRes] = await Promise.all([
          fetch(
            `${baseUrl.baseUrl}api/brynex/shoe-sales/summary?fromDate=${periodStart}&toDate=${periodEnd}`
          ).then(r => r.ok ? r.json() : { stores: [], grandTotal: {} }),
          fetch(
            `${baseUrl.baseUrl}api/brynex/shoe-sales/by-salesperson?fromDate=${periodStart}&toDate=${periodEnd}`
          ).then(r => r.ok ? r.json() : { salespersons: [] }),
          fetch(
            `${baseUrl.baseUrl}api/brynex/shoe-sales/summary?fromDate=${lyPeriodStart}&toDate=${lyPeriodEnd}`
          ).then(r => r.ok ? r.json() : { stores: [], grandTotal: {} })
        ]);

        const stores = Array.isArray(res.stores) ? res.stores : [];
        const salespersonsList = Array.isArray(resSalespersons.salespersons) ? resSalespersons.salespersons : [];
        setSalespersons(salespersonsList);

        const byBranch = {};
        let totalSalesQty = 0;
        let totalSalesValue = 0;
        let totalSalesBills = 0;

        stores.forEach(s => {
          const locCode = String(s.locCode || "");
          if (!locCode) return;

          const shoe  = s.shoe  || {};
          const shirt = s.shirt || {};
          const mixed = s.mixed || {};
          const total = s.total || {};

          // Store sales: combine shoe + shirt + mixed into total POS sales
          const salesValue = Math.round(total.value ?? ((shoe.value || 0) + (shirt.value || 0) + (mixed.value || 0)));
          const salesQty   = total.qty   ?? ((shoe.qty || 0) + (shirt.qty || 0) + (mixed.qty || 0));
          const salesBills = total.bills ?? ((shoe.bills || 0) + (shirt.bills || 0) + (mixed.bills || 0));

          byBranch[locCode] = {
            totalValue: salesValue,
            totalQty:   salesQty,
            totalBills: salesBills,
            shoeQty:    salesQty,
            shoeValue:  salesValue,
            shoeBills:  salesBills,
            shirtQty:   shirt.qty || 0,
            shirtValue: shirt.value || 0,
            shirtBills: shirt.bills || 0,
          };

          totalSalesQty   += salesQty;
          totalSalesValue += salesValue;
          totalSalesBills += salesBills;
        });

        setSalesData({
          shoeQty:    Math.round(totalSalesQty),
          shirtQty:   0,
          shoeValue:  Math.round(totalSalesValue),
          shirtValue: 0,
          shoeBills:  totalSalesBills,
          shirtBills: 0,
          salesQty:   Math.round(totalSalesQty),
          salesValue: Math.round(totalSalesValue),
          salesBills: totalSalesBills,
          byBranch
        });

        // Map last year sales data
        const lyStores = Array.isArray(lyRes.stores) ? lyRes.stores : [];
        const lyByBranch = {};
        let lyTotalSalesQty = 0;
        let lyTotalSalesValue = 0;
        let lyTotalSalesBills = 0;

        lyStores.forEach(s => {
          const locCode = String(s.locCode || "");
          if (!locCode) return;

          const shoe  = s.shoe  || {};
          const shirt = s.shirt || {};
          const mixed = s.mixed || {};
          const total = s.total || {};

          const salesValue = Math.round(total.value ?? ((shoe.value || 0) + (shirt.value || 0) + (mixed.value || 0)));
          const salesQty   = total.qty   ?? ((shoe.qty || 0) + (shirt.qty || 0) + (mixed.qty || 0));
          const salesBills = total.bills ?? ((shoe.bills || 0) + (shirt.bills || 0) + (mixed.bills || 0));

          lyByBranch[locCode] = {
            totalValue: salesValue,
            totalQty:   salesQty,
            totalBills: salesBills,
            shoeQty:    salesQty,
            shoeValue:  salesValue,
            shoeBills:  salesBills,
            shirtQty:   shirt.qty || 0,
            shirtValue: shirt.value || 0,
            shirtBills: shirt.bills || 0,
          };

          lyTotalSalesQty   += salesQty;
          lyTotalSalesValue += salesValue;
          lyTotalSalesBills += salesBills;
        });

        setLySalesData({
          shoeQty:    Math.round(lyTotalSalesQty),
          shirtQty:   0,
          shoeValue:  Math.round(lyTotalSalesValue),
          shirtValue: 0,
          shoeBills:  lyTotalSalesBills,
          shirtBills: 0,
          salesQty:   Math.round(lyTotalSalesQty),
          salesValue: Math.round(lyTotalSalesValue),
          salesBills: lyTotalSalesBills,
          byBranch:   lyByBranch
        });
      } catch (err) {
        console.error("Error fetching sales data in StoreInsights:", err);
      } finally {
        setLoadingSales(false);
      }
    };
    fetchSales();
  }, [branches, timeframe, customStartDate, customEndDate]);

  // Format values to match Indian standard layout (e.g. 5,28,080.42)
  const formatIndianNumber = (num, decimals = 0) => {
    const safeNum = Number(num) || 0;
    const isNegative = safeNum < 0;
    const absNum = Math.abs(safeNum);
    const parts = absNum.toFixed(decimals).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1] ? "." + parts[1] : "";

    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== "") {
      lastThree = "," + lastThree;
    }
    const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return (isNegative ? "-" : "") + res + decimalPart;
  };

  // Generate dynamic chart data based on branches
  const chartData = useMemo(() => {
    let customFactor = 1.0;
    if (timeframe === "CUSTOM") {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      customFactor = isNaN(diffDays) ? 1.0 : diffDays / 30.0;
    }

    const list = branches.map((b) => {
      const name = displayBranchName(b.workingBranch);
      const locId = getBranchLocationId(b.workingBranch);
      if (locId === "25") return null;
      const locCode = b.locCode || getBranchLocCode(b.workingBranch, branches);

      let target = 0;
      if (includeRental) {
        if (timeframe === "YTD") {
          target = getYTDStoreTarget(name);
        } else {
          const targetMonth = timeframe === "CUSTOM" ? getMonthNameFromDateStr(customStartDate) : CURRENT_MONTH_LONG;
          target = getStoreTarget(name, 0, timeframe === "CUSTOM" ? "CUSTOM" : timeframe, customFactor, targetMonth);
        }
      }

      const locPeriodList = includeRental ? (performanceData[locId] || []) : [];
      const dapprPeriodList = includeDappr ? (performanceData["25"] || []) : [];
      const dapprPeriodForStore = includeDappr ? getDapprSquadDataForStore(locId, dapprPeriodList) : [];
      const isGMGRoad = locId === "23";
      const unmappedDapprPeriodList = (isGMGRoad && includeDappr)
        ? dapprPeriodList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];
      const mergedPeriodList = [...locPeriodList, ...dapprPeriodForStore, ...unmappedDapprPeriodList];
      const rentalValue = mergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      // Branch sales (Sales Data: Shoe + Shirt combined)
      const branchSales = (locCode && salesData.byBranch?.[locCode]) || {};
      let shoeVal = 0;
      let custVal = 0;
      if (includeShoe) {
        shoeVal = branchSales.totalValue ?? (branchSales.shoeValue || 0);
      }

      let dapprVal = 0;
      if (includeDappr && (!dapprPeriodList || dapprPeriodList.length === 0) && !isGMGRoad) {
        const storeKey = normalizeForMatch(name);
        if (isStoreAdmin && dapprAttribution) {
          dapprVal = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
        } else if (storeDapprTotals && storeDapprTotals[storeKey]) {
          dapprVal = storeDapprTotals[storeKey].val || 0;
        }
      }

      if (includeCustomization) {
        const storeKey = normalizeForMatch(name);
        if (isStoreAdmin && customizationAttribution) {
          custVal += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
        } else if (storeCustomizationTotals && storeCustomizationTotals[storeKey]) {
          custVal += storeCustomizationTotals[storeKey].val || 0;
        }
      }

      const achieved = rentalValue + shoeVal + custVal + dapprVal;

      // Last Year value calculation for store
      const lyLocPeriodList = includeRental ? (lyPerformanceData[locId] || []) : [];
      const lyDapprPeriodList = includeDappr ? (lyPerformanceData["25"] || []) : [];
      const lyDapprPeriodForStore = includeDappr ? getDapprSquadDataForStore(locId, lyDapprPeriodList) : [];
      const lyUnmappedDapprPeriodList = (isGMGRoad && includeDappr)
        ? lyDapprPeriodList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];
      const lyMergedPeriodList = [...lyLocPeriodList, ...lyDapprPeriodForStore, ...lyUnmappedDapprPeriodList];
      const lyRentalValue = lyMergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      const lyBranchSales = (locCode && lySalesData.byBranch?.[locCode]) || {};
      let lyShoeVal = 0;
      let lyCustVal = 0;
      if (includeShoe) {
        lyShoeVal = lyBranchSales.totalValue ?? (lyBranchSales.shoeValue || 0);
      }

      const lyValue = lyRentalValue + lyShoeVal + lyCustVal;

      const balance = target - achieved;
      const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
      return { 
        name, 
        target, 
        achieved, 
        ty: achieved,
        ly: lyValue,
        balance, 
        pct, 
        abbr: getAbbreviation(name),
        _id: b._id
      };
    }).filter(Boolean);

    return list;
  }, [branches, selectedStreams, timeframe, customStartDate, customEndDate, weeklyTargets, storeWeekRanges, performanceData, lyPerformanceData, salesData, lySalesData, dapprAttribution, customizationAttribution, storeDapprTotals, storeCustomizationTotals, selectedStores, isStoreAdmin]);

  // Filter stores by cluster & store if selected
  const filteredStoresForKPIs = useMemo(() => {
    let list = chartData;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => assignedIds.add(String(b._id || b)));
        }
      });
      list = chartData.filter(s => assignedIds.has(String(s._id)));
    }
    if (selectedStores.length > 0 && !selectedStores.includes("All")) {
      list = list.filter(s => selectedStores.includes(s.name));
    }
    return list;
  }, [chartData, selectedClusters, clusters, selectedStores]);

  // Stores available for the store filter dropdown — scoped to selected cluster(s)
  const storeOptionsForFilter = useMemo(() => {
    let list = chartData;
    if (selectedClusters.length > 0 && !selectedClusters.includes("All")) {
      const assignedIds = new Set();
      selectedClusters.forEach(clusterId => {
        const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
        if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
          selectedClusterAdmin.branches.forEach(b => assignedIds.add(String(b._id || b)));
        }
      });
      list = chartData.filter(s => assignedIds.has(String(s._id)));
    }
    return list.map(s => s.name).filter(Boolean).sort(sortStoresGThenZ);
  }, [chartData, selectedClusters, clusters]);

  // Filtered chart data based on classification (All, On Track, At Risk)
  const filteredChartData = useMemo(() => {
    let list = filteredStoresForKPIs;
    if (graphType === "LY_VS_TY") {
      if (chartFilter === "On Track") {
        return list.filter(item => {
          const lyVal = item.ly || 0;
          const tyVal = item.ty !== undefined ? item.ty : (item.achieved || 0);
          return tyVal >= lyVal;
        });
      }
      if (chartFilter === "At Risk") {
        return list.filter(item => {
          const lyVal = item.ly || 0;
          const tyVal = item.ty !== undefined ? item.ty : (item.achieved || 0);
          return tyVal < lyVal;
        });
      }
      return list;
    }

    if (chartFilter === "On Track") {
      return list.filter(item => {
        const targetVal = item.target || 0;
        const achievedVal = item.achieved || 0;
        return targetVal > 0 ? achievedVal >= targetVal : achievedVal > 0;
      });
    }
    if (chartFilter === "At Risk") {
      return list.filter(item => {
        const targetVal = item.target || 0;
        const achievedVal = item.achieved || 0;
        return targetVal > 0 ? achievedVal < targetVal : achievedVal <= 0;
      });
    }
    return list;
  }, [filteredStoresForKPIs, chartFilter, graphType]);

  // Map shoe/shirt sales by locCode and staff name matching DSRReport's mergeSalespersons logic
  const salesByStaffMap = useMemo(() => {
    const map = {};
    (salespersons || []).forEach(sp => {
      const staffName = sp.salesperson || "Unassigned";
      const rawEmpCode = sp.empId || sp.employeeId || "";
      const empCode = normalizeEmpCode(rawEmpCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(staffName).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(staffName)) || "";
      const canon = getCanonicalStaffName(staffName);
      const storesList = Array.isArray(sp.stores) ? sp.stores : [];
      storesList.forEach(st => {
        const lc = String(st.locCode || "");
        const sName = st.storeName ? normalizeForMatch(st.storeName) : "";
        const shoe  = st.shoe  || {};
        const shirt = st.shirt || {};
        const mixed = st.mixed || {};
        const tot   = st.total || {};

        const shoeQty   = (shoe.qty   || 0) + (mixed.qty   || 0);
        const shoeValue = (shoe.value || 0) + (mixed.value || 0);
        const shoeBills = (shoe.bills || 0) + (mixed.bills || 0);
        const shirtQty   = shirt.qty   || 0;
        const shirtValue = shirt.value || 0;
        const shirtBills = shirt.bills || 0;

        const entryVal = {
          bills: tot.bills || 0,
          qty: tot.qty || 0,
          value: tot.value || 0,
          shoeBills, shoeQty, shoeValue,
          shirtBills, shirtQty, shirtValue,
          empCode: empCode,
          staffName: staffName
        };
        [lc, sName].filter(Boolean).forEach(key => {
          if (!map[key]) map[key] = {};
          map[key][canon] = entryVal;
          map[key][staffName] = entryVal;
          map[key][normalizeForMatch(staffName)] = entryVal;
          map[key][normalizeForMatch(canon)] = entryVal;
          if (empCode) {
            map[key][empCode] = entryVal;
          }
        });
      });
    });
    return map;
  }, [salespersons, systemEmpNameToCodeMap]);

  // Employee-level chart data for store_admin — shows each employee's achieved vs assigned target
  const employeeChartData = useMemo(() => {
    const isSingleStoreView = isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"));
    if (!isSingleStoreView || branches.length === 0) return [];
    const singleBranch = isStoreAdmin ? branches[0] : (branches.find(b => displayBranchName(b.workingBranch) === selectedStores[0]) || branches[0]);
    if (!singleBranch) return [];
    const locId = getBranchLocationId(singleBranch?.workingBranch);
    if (!locId) return [];
    const locCode = singleBranch.locCode || getBranchLocCode(singleBranch.workingBranch, branches);
    const locPeriodList = includeRental ? (performanceData[locId] || []) : [];

    // Helper: find shoe/shirt sales for a staff member based on active streams
    const getSalesDataForStaff = (staffName, entry) => {
      const canon = getCanonicalStaffName(staffName);
      const normStaff = normalizeForMatch(staffName);
      const normCanon = normalizeForMatch(canon);
      const branchKey = normalizeForMatch(singleBranch.workingBranch);
      const storeMaps = [
        locCode && salesByStaffMap[locCode],
        locId && salesByStaffMap[locId],
        branchKey && salesByStaffMap[branchKey]
      ].filter(Boolean);

      let found = null;
      for (const sm of storeMaps) {
        // 1. Search by empCodes first
        if (entry?.empCodes?.length) {
          for (const code of entry.empCodes) {
            if (sm[code]) { found = sm[code]; break; }
          }
          if (found) break;
        }

        // 2. Direct name matching
        if (sm[canon]) { found = sm[canon]; break; }
        if (sm[staffName]) { found = sm[staffName]; break; }
        if (sm[normCanon]) { found = sm[normCanon]; break; }
        if (sm[normStaff]) { found = sm[normStaff]; break; }

        // 3. Search through all keys in the store map
        const foundKey = Object.keys(sm).find(k => {
          const kCode = normalizeEmpCode(sm[k]?.empCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
          if (kCode && entry?.empCodes?.includes(kCode)) return true;
          return (entry?.rawNames || []).some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(staffName, k);
        });
        if (foundKey && sm[foundKey]) { found = sm[foundKey]; break; }
      }

      if (!found) return { bills: 0, qty: 0, value: 0 };

      let bills = 0, qty = 0, value = 0;
      if (includeShoe) {
        bills += found.bills ?? ((found.shoeBills || 0) + (found.shirtBills || 0));
        qty   += found.qty   ?? ((found.shoeQty || 0) + (found.shirtQty || 0));
        value += found.value ?? ((found.shoeValue || 0) + (found.shirtValue || 0));
      }
      return { bills, qty, value };
    };

    // Determine the target month name from the active timeframe
    const targetMonthName = timeframe === "CUSTOM"
      ? (customStartDate ? new Date(customStartDate).toLocaleString("en-US", { month: "long" }) : CURRENT_MONTH_LONG)
      : CURRENT_MONTH_LONG;

    const storeName = displayBranchName(singleBranch.workingBranch);
    const storeNorm = storeName.replace(/[.\-]/g, '-');
    const normKey = normalizeForMatch(storeName);

    const storeEmpTargets = employeeTargets[storeName]?.[targetMonthName] 
      || employeeTargets[storeNorm]?.[targetMonthName] 
      || employeeTargets[normKey]?.[targetMonthName] 
      || (Array.isArray(employeeTargets[storeName]) ? employeeTargets[storeName] : [])
      || (Array.isArray(employeeTargets[storeNorm]) ? employeeTargets[storeNorm] : [])
      || (Array.isArray(employeeTargets[normKey]) ? employeeTargets[normKey] : [])
      || [];

    const staffMap = new Map();

    const getOrCreateStaffEntry = (rawEmpCode, rawName) => {
      const normCode = normalizeEmpCode(rawEmpCode) || systemEmpNameToCodeMap?.get(normalizeForMatch(rawName)) || "";
      const trimmedName = rawName ? String(rawName).trim() : "";

      let entry = null;

      if (normCode) {
        for (const e of staffMap.values()) {
          if (e.empCodes.includes(normCode)) {
            entry = e;
            break;
          }
        }
      }

      if (!entry && (trimmedName || normCode)) {
        for (const e of staffMap.values()) {
          if (
            trimmedName && (isStaffNameMatch(e.displayName, trimmedName) || e.rawNames.some(rn => isStaffNameMatch(rn, trimmedName)))
          ) {
            entry = e;
            break;
          }
        }
      }

      if (!entry) {
        entry = {
          empCodes: normCode ? [normCode] : [],
          displayName: trimmedName || (normCode ? `Emp ${normCode}` : "Unassigned"),
          rawNames: trimmedName ? [trimmedName] : []
        };
        const key = normCode || (trimmedName || "unassigned").toLowerCase();
        staffMap.set(key, entry);
      } else {
        if (normCode && !entry.empCodes.includes(normCode)) {
          entry.empCodes.push(normCode);
        }
        if (trimmedName && !entry.rawNames.includes(trimmedName)) {
          entry.rawNames.push(trimmedName);
        }
        if (trimmedName && trimmedName.length > entry.displayName.length) {
          entry.displayName = trimmedName;
        }
      }

      return entry;
    };

    // 0. Seed all staff members belonging to this store from greytHR (Master List, Date-Aware)
    systemEmployees.forEach(e => {
      const b = e?.workingBranch || e?.branch || e?.store;
      if (b && (normalizeForMatch(b) === normKey || displayBranchName(b) === storeName || getBranchLocCode(b, branches) === String(locCode))) {
        if (e.leftorg) {
          if (e.leavingDate) {
            const lDate = String(e.leavingDate).split('T')[0];
            const startDate = timeframe === "CUSTOM" && customStartDate ? customStartDate : getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            if (lDate < startDate) {
              return; // Left before this timeframe started -> Skip
            }
          } else {
            return;
          }
        }
        const rawName = e.name || e.username || (e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : '');
        const empCode = e.EmpId || e.employeeId || e.empCode;
        if (rawName || empCode) {
          getOrCreateStaffEntry(empCode, rawName);
        }
      }
    });

    // 1. Process Rental POS items for this location
    if (includeRental) {
      locPeriodList.forEach(x => {
        if (x && (x.bookingBy || x.empCode)) {
          const rentalCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(x.bookingBy)) || "";
          getOrCreateStaffEntry(rentalCode, x.bookingBy);
        }
      });
    }

    // 2. Process Shoe/Shirt Salespersons for this location
    if (includeShoe) {
      (salespersons || []).forEach(sp => {
        const storesList = Array.isArray(sp.stores) ? sp.stores : [];
        const matchStore = storesList.find(st => String(st.locCode) === String(locCode) || (st.storeName && normalizeForMatch(st.storeName) === normKey));
        if (matchStore && ((matchStore.total?.value || 0) > 0 || (matchStore.total?.bills || 0) > 0)) {
          const rawCode = sp.empId || sp.employeeId || "";
          const staffName = sp.salesperson || "";
          const salesCode = normalizeEmpCode(rawCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(staffName).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(staffName)) || "";
          getOrCreateStaffEntry(salesCode, staffName);
        }
      });
    }

    // 3. Process Dappr & Customization attributions
    if (includeDappr) {
      Object.keys(dapprAttribution).forEach(k => {
        if (k && !isDapprSquadName(k)) {
          const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k)) || "";
          getOrCreateStaffEntry(kCode, k);
        }
      });
    }
    if (includeCustomization) {
      Object.keys(customizationAttribution).forEach(k => {
        if (k && !isDapprSquadName(k)) {
          const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k)) || "";
          getOrCreateStaffEntry(kCode, k);
        }
      });
    }

    // 4. Process configured Store Targets for this store
    storeEmpTargets.forEach(e => {
      if (e && e.staffName) {
        const tCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(e.staffName).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(e.staffName)) || "";
        getOrCreateStaffEntry(tCode, e.staffName);
      }
    });

    const staffEntries = Array.from(staffMap.values());



    // Helper: resolve a staff member's target for the current timeframe
    const resolveStaffTarget = (staffName, entry) => {
      const canon = getCanonicalStaffName(staffName);
      const normName = normalizeForMatch(staffName);
      const normCanon = normalizeForMatch(canon);
      const empT = storeEmpTargets.find(e => {
        const eCanon = getCanonicalStaffName(e.staffName);
        const eNorm = normalizeForMatch(e.staffName);
        const eNormCanon = normalizeForMatch(eCanon);
        if (e.staffName === staffName || eCanon === canon || eNorm === normName || eNormCanon === normCanon) return true;
        if (entry?.rawNames?.some(rn => rn === e.staffName || getCanonicalStaffName(rn) === eCanon || isStaffNameMatch(rn, e.staffName))) return true;
        return isStaffNameMatch(e.staffName, staffName) || isStaffNameMatch(e.staffName, canon);
      });
      if (!empT || !empT.weeklyTargets) return 0;
      const wt = empT.weeklyTargets;
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      if (timeframe === "MTD") {
        const monthStart = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = getDaysCountInMonth(targetMonthName, currentYear);
        const monthEnd = new Date(currentYear, currentMonth, lastDayOfMonth);
        const endDate = today > monthEnd ? monthEnd : (today < monthStart ? monthStart : today);
        return getTargetForRange(storeName, monthStart, endDate, targetMonthName, wt);
      }
      if (timeframe === "WTD") {
        const currentWeekId = getCurrentWeekId(storeName, targetMonthName);
        const weekRangesObj = getStoreWeekRange(storeName, targetMonthName);
        let activeWeekRangeStr = weekRangesObj ? (weekRangesObj[currentWeekId] || weekRangesObj[String(currentWeekId)]) : null;
        if (!activeWeekRangeStr || activeWeekRangeStr === "Select Days") {
          const daysInMonth = getDaysCountInMonth(targetMonthName, currentYear);
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
            return getTargetForRange(storeName, weekStart, endDate, targetMonthName, wt);
          }
        }
        return wt[currentWeekId] || 0;
      }
      if (timeframe === "CUSTOM") {
        return getCustomRangeTarget(storeName, customStartDate, customEndDate, targetMonthName, wt);
      }
      return 0;
    };

    // Last year store rental performance list for employee view
    const lyLocPeriodList = (isStoreAdmin && singleBranch && includeRental) ? (lyPerformanceData[locId] || []) : [];
    const allStaffDisplayNames = staffEntries.map(e => e.displayName);

    const result = staffEntries.map(entry => {
      const fullName = entry.displayName;
      const chartAbbr = getStaffChartAbbreviation(fullName, allStaffDisplayNames);

      const staffRentalItems = includeRental ? locPeriodList.filter(x => {
        if (!x) return false;
        const xCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(x.bookingBy));
        if (xCode && entry.empCodes.includes(xCode)) return true;
        return entry.rawNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(fullName, x.bookingBy);
      }) : [];

      let achieved = staffRentalItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      if (includeShoe || includeCustomization) {
        const staffSales = getSalesDataForStaff(fullName, entry);
        achieved += staffSales.value || 0;
      }

      if (includeDappr) {
        const dapprKey = Object.keys(dapprAttribution).find(k => {
          const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
          if (kCode && entry.empCodes.includes(kCode)) return true;
          return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(fullName, k);
        });
        if (dapprKey) {
          achieved += Number(dapprAttribution[dapprKey]?.billWtd) || 0;
        }
      }

      if (includeCustomization) {
        const custKey = Object.keys(customizationAttribution).find(k => {
          const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
          if (kCode && entry.empCodes.includes(kCode)) return true;
          return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(fullName, k);
        });
        if (custKey) {
          achieved += Number(customizationAttribution[custKey]?.billWtd) || 0;
        }
      }

      const staffLyRentalItems = includeRental ? lyLocPeriodList.filter(x => {
        if (!x) return false;
        const xCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(x.bookingBy));
        if (xCode && entry.empCodes.includes(xCode)) return true;
        return entry.rawNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(fullName, x.bookingBy);
      }) : [];
      const lyValue = staffLyRentalItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      const target = resolveStaffTarget(fullName, entry);
      const balance = target - achieved;
      const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
      return { name: fullName, abbr: chartAbbr, achieved, ty: achieved, ly: lyValue, target, balance, pct };
    });


    const activeResult = result.filter(item => {
      if (graphType === "LY_VS_TY") {
        return item.achieved > 0 || item.ly > 0;
      }
      return item.achieved > 0 || item.target > 0;
    });
    return activeResult.length > 0 
      ? activeResult.sort((a, b) => b.achieved - a.achieved) 
      : result.sort((a, b) => a.name.localeCompare(b.name));
  }, [isStoreAdmin, branches, performanceData, lyPerformanceData, employeeTargets, timeframe, customStartDate, customEndDate, selectedStreams, salespersons, salesData, dapprAttribution, customizationAttribution, systemEmpNameToCodeMap, systemEmpCodeToNameMap, employees, graphType]);




  // Dynamic KPI Card Data
  const stats = useMemo(() => {
    try {
    // Totals from filtered stores
    const totalTarget = filteredStoresForKPIs.reduce((acc, c) => acc + c.target, 0);
    const totalAchieved = filteredStoresForKPIs.reduce((acc, c) => acc + c.achieved, 0);
    const achievedPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

    // Scale other count metrics proportionally to the number of filtered stores vs total stores
    const ratio = chartData.length > 0 ? filteredStoresForKPIs.length / chartData.length : 1;
    
    // Customize stats based on selected role as well
    const roleMultiplier = roleFilter === "Store Admin" ? 0.35 : (roleFilter === "Admin" ? 0.85 : 1.0);

    const shiftDateYear = (dateStr, years = -1) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      d.setFullYear(d.getFullYear() + years);
      return getLocalDateString(d);
    };

    // --- Base Aggregations ---



    let rentalBills = 0;
    let rentalQty = 0;
    let rentalValue = 0;

    let lyRentalValue = 0;
    let lyRentalBills = 0;
    let lyRentalQty = 0;

    let shoeValue = 0, shirtValue = 0;
    let shoeQty = 0, shirtQty = 0;
    let shoeBills = 0, shirtBills = 0;

    let lyShoeValue = 0, lyShirtValue = 0;
    let lyShoeQty = 0, lyShirtQty = 0;
    let lyShoeBills = 0, lyShirtBills = 0;

    let customerWalkins = 0;
    let lyCustomerWalkins = 0;
    let convertedWalkinsCount = 0;
    let lyConvertedWalkinsCount = 0;

    filteredStoresForKPIs.forEach(c => {
      const name = c.name;
      const locId = getBranchLocationId(name);
      if (!locId || locId === "25") return; // Skip Dappr Squad itself

      // 1. Current Rental
      if (includeRental) {
        const locPeriodList = performanceData[locId] || [];
        rentalValue += locPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
        rentalBills += locPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
        rentalQty += locPeriodList.reduce((sum, item) => sum + (item.totalQuantity ?? 0), 0);
      }

      // 2. Last Year Rental
      if (includeRental) {
        const lyLocPeriodList = lyPerformanceData[locId] || [];
        lyRentalValue += lyLocPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
        lyRentalBills += lyLocPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
        lyRentalQty += lyLocPeriodList.reduce((sum, item) => sum + (item.totalQuantity ?? 0), 0);
      }

      // 3. Sales Data from byBranch (all POS sales: shoe + shirt)
      const bObj = branches.find(b => (c._id && String(b._id) === String(c._id)) || normalizeForMatch(b.workingBranch) === normalizeForMatch(name));
      const locCode = bObj?.locCode || getBranchLocCode(bObj?.workingBranch || name, branches);
      if (locCode && salesData.byBranch?.[locCode]) {
        const branchSales = salesData.byBranch[locCode];
        if (includeShoe) {
          shoeValue += branchSales.totalValue ?? (branchSales.shoeValue || 0);
          shoeQty   += branchSales.totalQty   ?? (branchSales.shoeQty || 0);
          shoeBills += branchSales.totalBills ?? (branchSales.shoeBills || 0);
        }
      }

      if (locCode && lySalesData.byBranch?.[locCode]) {
        const lyBranchSales = lySalesData.byBranch[locCode];
        if (includeShoe) {
          lyShoeValue += lyBranchSales.totalValue ?? (lyBranchSales.shoeValue || 0);
          lyShoeQty   += lyBranchSales.totalQty   ?? (lyBranchSales.shoeQty || 0);
          lyShoeBills += lyBranchSales.totalBills ?? (lyBranchSales.shoeBills || 0);
        }
      }

      // 4. Walkins
      const isStoreMatch = (w, branchObj) => {
        if (!w) return false;
        if (branchObj?._id && (w.storeId === branchObj._id || String(w.storeId) === String(branchObj._id))) return true;
        if (branchObj?.workingBranch && (w.store === branchObj.workingBranch || normalizeForMatch(w.store) === normalizeForMatch(branchObj.workingBranch))) return true;
        if (name && normalizeForMatch(w.store) === normalizeForMatch(name)) return true;
        return false;
      };

      const storeWalkins = walkins.filter(w => 
        isStoreMatch(w, bObj) && 
        isWalkinCreatedInRange(w.createdAt, periodStart, periodEnd)
      );
      customerWalkins += storeWalkins.length;
      convertedWalkinsCount += storeWalkins.filter(w => w.status?.toLowerCase() === "booked").length;

      const lyStoreWalkins = lyWalkins.filter(w => 
        isStoreMatch(w, bObj) && 
        isWalkinCreatedInRange(w.createdAt, lyPeriodStart, lyPeriodEnd)
      );
      const hardcodedCount = getHardcodedWalkin(bObj?.workingBranch || c.name, lyPeriodStart, lyPeriodEnd);
      if (hardcodedCount !== undefined && hardcodedCount !== null) {
        lyCustomerWalkins += hardcodedCount;
      } else {
        lyCustomerWalkins += lyStoreWalkins.length;
      }
      lyConvertedWalkinsCount += lyStoreWalkins.filter(w => w.status?.toLowerCase() === "booked").length;
    });

    let dapprSquadBills = 0;
    let dapprSquadValue = 0;
    let dapprSquadQty = 0;

    let lyDapprSquadBills = 0;
    let lyDapprSquadValue = 0;
    let lyDapprSquadQty = 0;

    const isSingleStoreOrAdmin = isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"));

    if (includeDappr) {
      const squadPeriodList = performanceData["25"] || [];
      const isAllStoresSelected = !isStoreAdmin && !isClusterAdmin && (selectedClusters.includes("All") || selectedClusters.length === 0) && (selectedStores.includes("All") || selectedStores.length === 0 || (typeof storeOptionsForFilter !== "undefined" && selectedStores.length === storeOptionsForFilter.length));

      if (squadPeriodList && squadPeriodList.length > 0) {
        if (isAllStoresSelected) {
          dapprSquadBills = squadPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
          dapprSquadValue = squadPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
          dapprSquadQty = squadPeriodList.reduce((sum, item) => sum + (item.totalQuantity || item.total_Number_Of_Bill || 0), 0);
        } else {
          filteredStoresForKPIs.forEach(c => {
            const name = c.name;
            const locId = getBranchLocationId(name);
            if (!locId || locId === "25") return;

            const dapprPeriodForStore = getDapprSquadDataForStore(locId, squadPeriodList);
            const isGMGRoad = locId === "23";
            const unmappedDapprPeriodList = isGMGRoad
              ? squadPeriodList.filter(item => {
                  const raw = String(item.bookingBy || "").trim().toLowerCase();
                  const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
                  const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
                  return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
                })
              : [];
            const mergedList = [...dapprPeriodForStore, ...unmappedDapprPeriodList];

            dapprSquadBills += mergedList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
            dapprSquadValue += mergedList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
            dapprSquadQty += mergedList.reduce((sum, item) => sum + (item.totalQuantity || item.total_Number_Of_Bill || 0), 0);
          });
        }
      } else if (isSingleStoreOrAdmin && dapprAttribution && Object.keys(dapprAttribution).length > 0) {
        dapprSquadBills = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.valWtd) || 0), 0);
        dapprSquadValue = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
        dapprSquadQty = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.qtyWtd) || 0), 0);
      } else {
        filteredStoresForKPIs.forEach(c => {
          const storeKey = normalizeForMatch(c.name);
          if (storeDapprTotals && storeDapprTotals[storeKey] && (storeDapprTotals[storeKey].bills > 0 || storeDapprTotals[storeKey].val > 0)) {
            dapprSquadBills += storeDapprTotals[storeKey].bills || 0;
            dapprSquadValue += storeDapprTotals[storeKey].val || 0;
            dapprSquadQty += storeDapprTotals[storeKey].qty || 0;
          }
        });
      }

      // Last Year Dappr Squad
      const lySquadPeriodList = lyPerformanceData["25"] || [];
      if (lySquadPeriodList && lySquadPeriodList.length > 0) {
        if (isAllStoresSelected) {
          lyDapprSquadBills = lySquadPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
          lyDapprSquadValue = lySquadPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
          lyDapprSquadQty = lySquadPeriodList.reduce((sum, item) => sum + (item.totalQuantity || item.total_Number_Of_Bill || 0), 0);
        } else {
          filteredStoresForKPIs.forEach(c => {
            const name = c.name;
            const locId = getBranchLocationId(name);
            if (!locId || locId === "25") return;
            const isGMGRoad = locId === "23";
            const lyDapprPeriodForStore = getDapprSquadDataForStore(locId, lySquadPeriodList);
            const lyUnmappedDapprPeriodList = isGMGRoad
              ? lySquadPeriodList.filter(item => {
                  const raw = String(item.bookingBy || "").trim().toLowerCase();
                  const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
                  const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
                  return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
                })
              : [];
            const lyMergedList = [...lyDapprPeriodForStore, ...lyUnmappedDapprPeriodList];
            lyDapprSquadBills += lyMergedList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
            lyDapprSquadValue += lyMergedList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
            lyDapprSquadQty += lyMergedList.reduce((sum, item) => sum + (item.totalQuantity || item.total_Number_Of_Bill || 0), 0);
          });
        }
      }
    }

    if (includeCustomization) {
      if (isSingleStoreOrAdmin) {
        if (customizationAttribution && Object.keys(customizationAttribution).length > 0) {
          shirtBills += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.valWtd) || 0), 0);
          shirtValue += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
          shirtQty += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.qtyWtd) || 0), 0);
        }
      } else {
        filteredStoresForKPIs.forEach(c => {
          const storeKey = normalizeForMatch(c.name);
          if (storeCustomizationTotals && storeCustomizationTotals[storeKey] && (storeCustomizationTotals[storeKey].bills > 0 || storeCustomizationTotals[storeKey].val > 0)) {
            shirtBills += storeCustomizationTotals[storeKey].bills || 0;
            shirtValue += storeCustomizationTotals[storeKey].val || 0;
            shirtQty += storeCustomizationTotals[storeKey].qty || 0;
          }
        });
      }
    }

    // Database-wide Walkins override for consolidated cluster filter "All" AND no store filter (Admin / Super Admin only)
    if ((selectedClusters.includes("All") || selectedClusters.length === 0) && (selectedStores.includes("All") || selectedStores.length === 0) && !isStoreAdmin && !isClusterAdmin) {
      customerWalkins = walkins.filter(w => isWalkinCreatedInRange(w.createdAt, periodStart, periodEnd)).length;
      
      let hardcodedSumAll = 0;
      let hasAnyHardcoded = false;
      filteredStoresForKPIs.forEach(c => {
        const bObj = branches.find(b => normalizeForMatch(b.workingBranch) === normalizeForMatch(c.name));
        const hVal = getHardcodedWalkin(bObj?.workingBranch || c.name, lyPeriodStart, lyPeriodEnd);
        if (hVal !== undefined && hVal !== null) {
          hardcodedSumAll += hVal;
          hasAnyHardcoded = true;
        }
      });

      if (hasAnyHardcoded) {
        lyCustomerWalkins = hardcodedSumAll;
      } else {
        lyCustomerWalkins = lyWalkins.filter(w => isWalkinCreatedInRange(w.createdAt, lyPeriodStart, lyPeriodEnd)).length;
      }

      convertedWalkinsCount = walkins.filter(w => 
        isWalkinCreatedInRange(w.createdAt, periodStart, periodEnd) && 
        w.status?.toLowerCase() === "booked"
      ).length;
      lyConvertedWalkinsCount = lyWalkins.filter(w => 
        isWalkinCreatedInRange(w.createdAt, lyPeriodStart, lyPeriodEnd) && 
        w.status?.toLowerCase() === "booked"
      ).length;
    }
        const getChangeStats = (curr, prev) => {
      const diff = curr - prev;
      if (prev <= 0) {
        const isPos = curr > 0;
        const isZero = curr === 0;
        return {
          display: isZero ? "0%" : (isPos ? "+100%" : "0%"),
          color: isZero ? "text-gray-500" : (isPos ? "text-emerald-600" : "text-rose-500"),
          trend: isZero ? "neutral" : (isPos ? "up" : "down"),
          trendColor: isZero ? "#6b7280" : (isPos ? "#00A36C" : "#e11d48"),
          curr,
          prev,
          diff
        };
      }

      const rawPct = (diff / prev) * 100;
      const absPct = Math.abs(rawPct);
      
      let pctStr = "";
      if (absPct === 0) {
        pctStr = "0";
      } else if (absPct < 1 || (absPct < 10 && Math.abs(rawPct % 1) >= 0.05)) {
        pctStr = rawPct.toFixed(1);
      } else {
        pctStr = Math.round(rawPct).toString();
      }

      if (pctStr === "-0" || pctStr === "-0.0" || pctStr === "+0" || pctStr === "0.0") {
        if (diff < 0) pctStr = "-0.1";
        else pctStr = "+0%";
      } else {
        pctStr = `${rawPct > 0 ? "+" : ""}${pctStr}%`;
      }

      const isPositive = diff > 0;
      const isNeutral = diff === 0;

      return {
        display: pctStr,
        color: isNeutral ? "text-gray-500" : (isPositive ? "text-emerald-600" : "text-rose-500"),
        trend: isNeutral ? "neutral" : (isPositive ? "up" : "down"),
        trendColor: isNeutral ? "#6b7280" : (isPositive ? "#00A36C" : "#e11d48"),
        curr,
        prev,
        diff
      };
    };

    const activeReviewField = (timeframe === "FTD" || timeframe === "TODAY") 
      ? "today" 
      : (timeframe === "WTD" ? "thisWeek" : (timeframe === "YTD" ? "total" : (timeframe === "CUSTOM" ? "periodCount" : "thisMonth")));

    const isAllSelected = !isStoreAdmin && !isClusterAdmin 
      && (selectedStores.includes("All") || selectedStores.length === 0) 
      && (selectedClusters.includes("All") || selectedClusters.length === 0);

    const isBranchMatchingFilter = (branchKey) => {
      if (isAllSelected) return true;
      const normKey = normalizeForMatch(branchKey);
      const bObj = branches.find(b => 
        normalizeForMatch(b.workingBranch) === normKey || 
        normalizeForMatch(displayBranchName(b.workingBranch)) === normKey
      );
      const displayName = bObj ? displayBranchName(bObj.workingBranch) : branchKey;
      const normDisplay = normalizeForMatch(displayName);
      const branchLocId = bObj ? getBranchLocationId(bObj.workingBranch) : getBranchLocationId(branchKey);

      return filteredStoresForKPIs.some(s => {
        const normS = normalizeForMatch(s.name);
        const sLocId = getBranchLocationId(s.name);
        return normS === normKey || 
               normS === normDisplay || 
               (branchLocId && sLocId && branchLocId === sLocId);
      });
    };

    const googleReviews = (() => {
      if (!googleReviewData || Object.keys(googleReviewData).length === 0) return 0;
      return Object.entries(googleReviewData).reduce((sum, [branchKey, d]) => {
        if (!d || !isBranchMatchingFilter(branchKey)) return sum;
        const val = d.periodCount !== undefined ? d.periodCount : (d[activeReviewField] !== undefined ? d[activeReviewField] : (d.thisMonth || 0));
        return sum + (Number(val) || 0);
      }, 0);
    })();

    const lyGoogleReviews = (() => {
      if (!googleReviewData || Object.keys(googleReviewData).length === 0) return 0;
      return Object.entries(googleReviewData).reduce((sum, [branchKey, d]) => {
        if (!d || !isBranchMatchingFilter(branchKey)) return sum;
        return sum + (d.lyThisMonth || 0);
      }, 0);
    })();

    const googleRating = (() => {
      if (!googleReviewData || Object.keys(googleReviewData).length === 0) return 0;
      const activeEntries = Object.entries(googleReviewData)
        .filter(([branchKey, d]) => d && isBranchMatchingFilter(branchKey))
        .map(([, d]) => d);

      const ratedEntries = activeEntries.filter(entry => entry.rating > 0);
      if (ratedEntries.length === 0) return 0;

      const sum = ratedEntries.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      return parseFloat((sum / ratedEntries.length).toFixed(1));
    })();

    const totalReviewsCount = (() => {
      if (!googleReviewData || Object.keys(googleReviewData).length === 0) return 0;
      return Object.entries(googleReviewData).reduce((sum, [branchKey, d]) => {
        if (!d || !isBranchMatchingFilter(branchKey)) return sum;
        return sum + (d.total || 0);
      }, 0);
    })();

    const activeAchievedValue = ((isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"))) && employeeChartData.length > 0)
      ? employeeChartData.reduce((sum, emp) => sum + emp.achieved, 0)
      : totalAchieved;
    const activeBills = rentalBills + dapprSquadBills + shoeBills + shirtBills;
    const activeTotalQty = rentalQty + dapprSquadQty + shoeQty + shirtQty;

    const totalLy = filteredStoresForKPIs.reduce((acc, c) => acc + (c.ly || 0), 0);
    const employeeLySum = employeeChartData.reduce((sum, emp) => sum + (emp.ly || 0), 0);
    const lyActiveAchievedValue = totalLy > 0 ? totalLy : employeeLySum;
    const lyActiveBills = lyRentalBills + lyDapprSquadBills + lyShoeBills + lyShirtBills;
    const lyActiveQty = lyRentalQty + lyDapprSquadQty + lyShoeQty + lyShirtQty;

    const trueAchievedPct = totalTarget > 0 ? Math.round((activeAchievedValue / totalTarget) * 100) : 0;

    const basketSize = activeBills > 0 ? (activeTotalQty / activeBills).toFixed(1) : "0.0";
    const basketValue = activeBills > 0 ? Math.round(activeAchievedValue / activeBills) : 0;
    const conversionRate = customerWalkins > 0 ? Math.round((activeBills / customerWalkins) * 100) : 0;

    const valChange = getChangeStats(activeAchievedValue * roleMultiplier, lyActiveAchievedValue * roleMultiplier);
    const billsChange = getChangeStats(activeBills * roleMultiplier, lyActiveBills * roleMultiplier);
    const qtyChange = getChangeStats(activeTotalQty * roleMultiplier, lyActiveQty * roleMultiplier);
    const absChange = getChangeStats(
      parseFloat(basketSize),
      lyActiveBills > 0 ? parseFloat((lyActiveQty / lyActiveBills).toFixed(1)) : 0.0
    );
    const abvChange = getChangeStats(
      basketValue,
      lyActiveBills > 0 ? Math.round(lyActiveAchievedValue / lyActiveBills) : 0
    );
    const walkChange = getChangeStats(customerWalkins * roleMultiplier, lyCustomerWalkins * roleMultiplier);

    // Individual category card calculations (always shows individual category level data)
    let cardShoeQty = 0, cardShirtQty = 0;
    let cardShoeValue = 0, cardShirtValue = 0;
    let lyCardShoeQty = 0, lyCardShirtQty = 0;
    let lyCardShoeValue = 0, lyCardShirtValue = 0;

    filteredStoresForKPIs.forEach(c => {
      const cName = c.name;
      const cBObj = branches.find(b => normalizeForMatch(b.workingBranch) === normalizeForMatch(cName));
      const cLocCode = cBObj?.locCode || getBranchLocCode(cBObj?.workingBranch || cName, branches);
      if (cLocCode && salesData.byBranch?.[cLocCode]) {
        const bs = salesData.byBranch[cLocCode];
        cardShoeQty += bs.totalQty ?? (bs.shoeQty || 0);
        cardShirtQty += bs.shirtQty || 0;
        cardShoeValue += bs.totalValue ?? (bs.shoeValue || 0);
        cardShirtValue += bs.shirtValue || 0;
      }
      if (cLocCode && lySalesData.byBranch?.[cLocCode]) {
        const lbs = lySalesData.byBranch[cLocCode];
        lyCardShoeQty += lbs.totalQty ?? (lbs.shoeQty || 0);
        lyCardShirtQty += lbs.shirtQty || 0;
        lyCardShoeValue += lbs.totalValue ?? (lbs.shoeValue || 0);
        lyCardShirtValue += lbs.shirtValue || 0;
      }
    });

    const lyConversionRate = lyCustomerWalkins > 0 ? Math.round((lyActiveBills / lyCustomerWalkins) * 100) : 0;
    const conversionChange = getChangeStats(conversionRate, lyConversionRate);
    const shoeChange = getChangeStats(cardShoeQty, lyCardShoeQty);
    const shirtChange = getChangeStats(cardShirtQty, lyCardShirtQty);
    const shoeRate = activeBills > 0 ? parseFloat(((cardShoeQty / activeBills) * 100).toFixed(1)) : 0;
    const lyShoeRate = lyActiveBills > 0 ? parseFloat(((lyCardShoeQty / lyActiveBills) * 100).toFixed(1)) : 0;
    const shoeRateChange = getChangeStats(shoeRate, lyShoeRate);

    const shirtRate = activeBills > 0 ? parseFloat(((cardShirtQty / activeBills) * 100).toFixed(1)) : 0;
    const lyShirtRate = lyActiveBills > 0 ? parseFloat(((lyCardShirtQty / lyActiveBills) * 100).toFixed(1)) : 0;
    const shirtRateChange = getChangeStats(shirtRate, lyShirtRate);

    const dapprChange = getChangeStats(dapprSquadBills, lyDapprSquadBills);
    const dapprValChange = getChangeStats(dapprSquadValue, lyDapprSquadValue);
    const reviewsChange = getChangeStats(googleReviews, lyGoogleReviews);
    const googleReviewRate = activeBills > 0 ? parseFloat((((googleReviews || 0) / activeBills) * 100).toFixed(1)) : 0;
    const lyGoogleReviewRate = lyActiveBills > 0 ? parseFloat((((lyGoogleReviews || 0) / lyActiveBills) * 100).toFixed(1)) : 0;

    return {
      achievedPct: trueAchievedPct,
      targetValue: totalTarget * roleMultiplier,
      achievedValue: activeAchievedValue * roleMultiplier,
      billsGenerated: activeBills * roleMultiplier,
      quantitySold: activeTotalQty * roleMultiplier,
      basketSize,
      basketValue,
      customerWalkins: customerWalkins * roleMultiplier,
      conversionRate,
      convertedWalkins: convertedWalkinsCount * roleMultiplier,
      shoeSale: cardShoeQty,
      shoeValue: cardShoeValue,
      shoeRate,
      lyShoeRate,
      shoeRateChange,
      shirtSales: cardShirtQty,
      shirtValue: cardShirtValue,
      shirtRate,
      lyShirtRate,
      shirtRateChange,
      dapprSquadBills: dapprSquadBills * roleMultiplier,
      dapprSquadValue: dapprSquadValue * roleMultiplier,
      lyDapprSquadBills: lyDapprSquadBills * roleMultiplier,
      lyDapprSquadValue: lyDapprSquadValue * roleMultiplier,
      dapprValChange,
      googleReviews,
      googleRating,
      googleReviewRate,
      lyGoogleReviewRate,
      
      valChangeDisplay: valChange.display, valChangeColor: valChange.color, valTrend: valChange.trend, valTrendColor: valChange.trendColor,
      billsChangeDisplay: billsChange.display, billsChangeColor: billsChange.color, billsTrend: billsChange.trend, billsTrendColor: billsChange.trendColor,
      qtyChangeDisplay: qtyChange.display, qtyChangeColor: qtyChange.color, qtyTrend: qtyChange.trend, qtyTrendColor: qtyChange.trendColor,
      absChangeDisplay: absChange.display, absChangeColor: absChange.color, absTrend: absChange.trend, absTrendColor: absChange.trendColor,
      abvChangeDisplay: abvChange.display, abvChangeColor: abvChange.color, abvTrend: abvChange.trend, abvTrendColor: abvChange.trendColor,
      walkChangeDisplay: walkChange.display, walkChangeColor: walkChange.color, walkTrend: walkChange.trend, walkTrendColor: walkChange.trendColor,
      valChange,
      billsChange,
      qtyChange,
      absChange,
      abvChange,
      walkChange,
      lyConversionRate,
      conversionChange,
      shoeChange,
      shirtChange,
      dapprChange,
      reviewsChange,
      lyCardShoeQty,
      lyCardShirtQty,
      lyCardShoeValue,
      lyCardShirtValue,
      lyGoogleReviews,
      totalReviewsCount
    };
    } catch (err) {
      console.error("[StoreInsights] Error computing stats:", err);
      return null;
    }
  }, [chartData, filteredStoresForKPIs, selectedStreams, roleFilter, performanceData, lyPerformanceData, walkins, lyWalkins, timeframe, customStartDate, customEndDate, salesData, lySalesData, isStoreAdmin, isClusterAdmin, selectedClusters, selectedStores, branches, periodStart, periodEnd, lyPeriodStart, lyPeriodEnd, googleReviewData, dapprAttribution, storeDapprTotals, customizationAttribution, storeCustomizationTotals]);

  // Store ranking data calculations
  const rankingData = useMemo(() => {
    const showStaffRanking = isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"));
    if (showStaffRanking) {
      if (branches.length === 0) return [];
      const singleBranch = (selectedStores.length === 1 && !selectedStores.includes("All"))
        ? branches.find(b => displayBranchName(b.workingBranch) === selectedStores[0])
        : branches[0];

      if (!singleBranch) return [];
      const name = displayBranchName(singleBranch?.workingBranch);
      const storeKeyVal = normalizeForMatch(singleBranch?.workingBranch);
      const locId = getBranchLocationId(singleBranch?.workingBranch);
      const locCode = singleBranch.locCode || getBranchLocCode(singleBranch.workingBranch, branches);

      const locPeriodList = performanceData[locId] || [];

      // Find shoe sales specifically for this branch's locCode from salespersons
      const getSalesDataForStaff = (staffName) => {
        const canon = getCanonicalStaffName(staffName);
        if (locCode && salesByStaffMap[locCode]) {
          if (salesByStaffMap[locCode][canon]) return salesByStaffMap[locCode][canon];
          if (salesByStaffMap[locCode][staffName]) return salesByStaffMap[locCode][staffName];
        }
        return { bills: 0, qty: 0, value: 0 };
      };

      const canonicalizeName = (rawName) => {
        if (!rawName) return "";
        const strName = String(rawName);
        if (strName.toLowerCase() === "unassigned") return "Unassigned";
        const canon = getCanonicalStaffName(strName);
        const match = locPeriodList.find(n => n && (n.bookingBy === canon || isStaffNameMatch(n.bookingBy, strName)));
        return match ? match.bookingBy : canon;
      };

      const salesStaffNames = (includeShoe || includeCustomization)
        ? salespersons
            .filter(sp => sp.stores && sp.stores.some(st => String(st.locCode) === String(locCode)))
            .map(sp => canonicalizeName(sp.salesperson))
            .filter(Boolean)
        : [];

      const isInvalidStaffName = (name) => {
        if (!name || typeof name !== 'string') return true;
        const lower = name.trim().toLowerCase();
        if (!lower || lower === 'none' || lower === 'store total' || lower === 'store_total' || lower === 'store-total' || lower === 'total' || lower === 'unassigned') return true;
        const norm = normalizeForMatch(name);
        if (branches && branches.some(b => normalizeForMatch(b.workingBranch) === norm || normalizeForMatch(displayBranchName(b.workingBranch)) === norm)) return true;
        if (lower.startsWith('suitor guy') || lower.startsWith('zorucci') || lower.startsWith('dappr squad') || lower === 'office' || lower === 'production' || lower === 'warehouse') return true;
        return false;
      };

      const rawStaffNames = [
        ...locPeriodList.map(x => x && x.bookingBy),
        ...salesStaffNames,
        ...(includeDappr ? Object.keys(dapprAttribution) : []),
        ...(includeCustomization ? Object.keys(customizationAttribution) : [])
      ]
        .filter(name => typeof name === "string" && !isInvalidStaffName(name))
        .map(getCanonicalStaffName);

      const sortedStaffNames = Array.from(new Set(rawStaffNames)).sort((a, b) => (b || "").length - (a || "").length);

      const staffEntries = [];
      sortedStaffNames.forEach(rawName => {
        const canonName = getCanonicalStaffName(rawName);
        const normReal = normalizeForMatch(canonName);
        const empCode = systemEmpNameToCodeMap?.get(canonName.toLowerCase()) || systemEmpNameToCodeMap?.get(normReal);

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

      // Filter walkins for this store
      const storeWalkins = walkins.filter(w => 
        (w.storeId === singleBranch?._id || String(w.storeId) === String(singleBranch?._id) || w.store === singleBranch?.workingBranch || (w.store && singleBranch?.workingBranch && normalizeForMatch(w.store) === normalizeForMatch(singleBranch.workingBranch))) && 
        isWalkinCreatedInRange(w.createdAt, periodStart, periodEnd)
      );

      // Sum total value of the store across active streams to calculate contribution %
      let storeTotalValue = 0;
      if (includeRental) {
        storeTotalValue += locPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
      }
      const branchSales = salesData.byBranch?.[locCode] || {};
      if (includeShoe) {
        storeTotalValue += branchSales.totalValue ?? (branchSales.shoeValue || 0);
      }
      if (includeCustomization) {
        storeTotalValue += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
      }
      if (includeDappr) {
        storeTotalValue += Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
      }

      if (staffEntries.length === 0) {
        return [];
      }

      return staffEntries.map(entry => {
        const staffName = entry.displayName;

        const staffFtdList = includeRental ? locPeriodList.filter(x => {
          if (!x) return false;
          const xCode = normalizeEmpCode(x.empCode) || systemEmpNameToCodeMap?.get(getCanonicalStaffName(x.bookingBy).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(x.bookingBy));
          if (xCode && entry.empCodes.includes(xCode)) return true;
          return entry.rawNames.some(rn => isStaffNameMatch(rn, x.bookingBy)) || isStaffNameMatch(staffName, x.bookingBy);
        }) : [];

        let bills = 0;
        let qty = 0;
        let value = 0;

        if (includeRental) {
          bills += staffFtdList.reduce((sum, x) => sum + (x.total_Number_Of_Bill || 0), 0);
          qty += staffFtdList.reduce((sum, x) => sum + (x.totalQuantity || 0), 0);
          value += staffFtdList.reduce((sum, x) => sum + (x.totalValue || 0), 0);
        }

        if (includeShoe) {
          const storeMaps = [
            locCode && salesByStaffMap[locCode],
            locId && salesByStaffMap[locId],
            singleBranch && normalizeForMatch(singleBranch.workingBranch) && salesByStaffMap[normalizeForMatch(singleBranch.workingBranch)]
          ].filter(Boolean);

          for (const sm of storeMaps) {
            const staffSalesKey = Object.keys(sm).find(k => {
              const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
              if (kCode && entry.empCodes.includes(kCode)) return true;
              return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(staffName, k);
            });
            if (staffSalesKey && sm[staffSalesKey]) {
              const sData = sm[staffSalesKey];
              bills += sData.bills ?? ((sData.shoeBills || 0) + (sData.shirtBills || 0));
              qty   += sData.qty   ?? ((sData.shoeQty || 0) + (sData.shirtQty || 0));
              value += sData.value ?? ((sData.shoeValue || 0) + (sData.shirtValue || 0));
              break;
            }
          }
        }

        if (includeDappr) {
          const dapprKey = Object.keys(dapprAttribution).find(k => {
            const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
            if (kCode && entry.empCodes.includes(kCode)) return true;
            return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(staffName, k);
          });
          if (dapprKey) {
            const dAttr = dapprAttribution[dapprKey] || {};
            value += Number(dAttr.billWtd) || 0;
            bills += Number(dAttr.valWtd)  || 0;
            qty   += Number(dAttr.qtyWtd)  || 0;
          }
        }

        if (includeCustomization) {
          const custKey = Object.keys(customizationAttribution).find(k => {
            const kCode = systemEmpNameToCodeMap?.get(getCanonicalStaffName(k).toLowerCase()) || systemEmpNameToCodeMap?.get(normalizeForMatch(k));
            if (kCode && entry.empCodes.includes(kCode)) return true;
            return entry.rawNames.some(rn => isStaffNameMatch(rn, k)) || isStaffNameMatch(staffName, k);
          });
          if (custKey) {
            const cAttr = customizationAttribution[custKey] || {};
            value += Number(cAttr.billWtd) || 0;
            bills += Number(cAttr.valWtd)  || 0;
            qty   += Number(cAttr.qtyWtd)  || 0;
          }
        }

        const abs = bills > 0 ? parseFloat((qty / bills).toFixed(1)) : 0;
        const abv = bills > 0 ? Math.round(value / bills) : 0;

        // Conversion = bills / walkins for this staff
        const staffWalkins = storeWalkins.filter(w => {
          const wCodes = extractWalkinEmpCodes(w, systemEmpNameToCodeMap);
          if (wCodes.length > 0 && entry.empCodes.some(c => wCodes.includes(c))) return true;
          const wStaff = w.staff || w.staffName || (typeof w.createdBy === 'string' ? w.createdBy : w.createdBy?.name) || w.managerName || '';
          if (!wStaff) {
            return staffName.toLowerCase() === "unassigned";
          }
          return entry.rawNames.some(rn => isStaffNameMatch(rn, wStaff)) || isStaffNameMatch(wStaff, staffName);
        }).length;
        const conversion = staffWalkins > 0 ? Math.round((bills / staffWalkins) * 100) : 0;

        // Contribution % of total store revenue
        const contribution = storeTotalValue > 0 ? Math.round((value / storeTotalValue) * 100) : 0;

        return {
          name: staffName,
          targetAchieved: value,
          value,
          contribution,
          abs,
          abv,
          conversion
        };
      });
    }

    const defaultStores = [
      { name: "Zorucci Edappally", targetAchieved: 96, contribution: 96, abs: 2.3, abv: 2200, conversion: 87 },
      { name: "Suitor Guy Edappally", targetAchieved: 92, contribution: 96, abs: 3.2, abv: 3124, conversion: 85 },
      { name: "Suitor Guy Trivandrum", targetAchieved: 90, contribution: 96, abs: 2.6, abv: 3243, conversion: 90 },
      { name: "Suitor Guy Vadakara", targetAchieved: 86, contribution: 96, abs: 3.1, abv: 2020, conversion: 94 },
      { name: "Zorucci Perinthalmanna", targetAchieved: 84, contribution: 96, abs: 2.8, abv: 2811, conversion: 79 },
      { name: "Suitor Guy Manjeri", targetAchieved: 83, contribution: 96, abs: 3.4, abv: 2429, conversion: 81 }
    ];

    const activeBranches = branches
      .filter(b => getBranchLocationId(b.workingBranch) !== "25")
      .filter(b => {
        if (selectedClusters.includes("All") || selectedClusters.length === 0) return true;
        const assignedIds = new Set();
        selectedClusters.forEach(clusterId => {
          const selectedClusterAdmin = clusters.find(c => String(c._id) === String(clusterId));
          if (selectedClusterAdmin && Array.isArray(selectedClusterAdmin.branches)) {
            selectedClusterAdmin.branches.forEach(br => assignedIds.add(String(br._id || br)));
          }
        });
        return assignedIds.has(String(b._id));
      })
      .filter(b => selectedStores.includes("All") || selectedStores.length === 0 || selectedStores.includes(displayBranchName(b.workingBranch)));

    // Calculate active total value across all stores for contribution %
    let totalStoresValue = 0;
    const storeMetrics = activeBranches.map(b => {
      const name = displayBranchName(b.workingBranch);
      const locId = getBranchLocationId(b.workingBranch);
      const locCode = b.locCode || getBranchLocCode(b.workingBranch, branches);

      const locPeriodList = includeRental ? (performanceData[locId] || []) : [];
      const dapprPeriodList = includeDappr ? (performanceData["25"] || []) : [];
      const dapprPeriodForStore = includeDappr ? getDapprSquadDataForStore(locId, dapprPeriodList) : [];
      const isGMGRoad = locId === "23";
      const unmappedDapprPeriodList = (isGMGRoad && includeDappr)
        ? dapprPeriodList.filter(item => {
            const raw = String(item.bookingBy || "").trim().toLowerCase();
            const alphaOnly = raw.replace(/[^a-z0-9]/g, "");
            const dotted = alphaOnly.startsWith("sg") ? "sg." + alphaOnly.slice(2) : raw;
            return !DAPPR_SQUAD_STORE_MAPPING[raw] && !DAPPR_SQUAD_STORE_MAPPING[dotted];
          })
        : [];
      const mergedPeriodList = [...locPeriodList, ...dapprPeriodForStore, ...unmappedDapprPeriodList];

      const rentalVal = mergedPeriodList.reduce((sum, item) => sum + (item.totalValue || 0), 0);
      const rentalBills = mergedPeriodList.reduce((sum, item) => sum + (item.total_Number_Of_Bill || 0), 0);
      const rentalQty = mergedPeriodList.reduce((sum, item) => sum + (item.totalQuantity ?? 0), 0);

      const branchSales = (locCode && salesData.byBranch?.[locCode]) || {};
      let shoeVal = 0, shoeBills = 0, shoeQty = 0;
      let custVal = 0, custBills = 0, custQty = 0;

      if (includeShoe) {
        shoeVal = branchSales.totalValue ?? (branchSales.shoeValue || 0);
        shoeBills = branchSales.totalBills ?? (branchSales.shoeBills || 0);
        shoeQty = branchSales.totalQty ?? (branchSales.shoeQty || 0);
      }

      if (includeCustomization) {
        const storeKey = normalizeForMatch(name);
        if (isStoreAdmin && customizationAttribution) {
          custVal += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
          custBills += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.valWtd) || 0), 0);
          custQty += Object.values(customizationAttribution).reduce((s, v) => s + (Number(v.qtyWtd) || 0), 0);
        } else if (storeCustomizationTotals && storeCustomizationTotals[storeKey]) {
          custVal += storeCustomizationTotals[storeKey].val || 0;
          custBills += storeCustomizationTotals[storeKey].bills || 0;
          custQty += storeCustomizationTotals[storeKey].qty || 0;
        }
      }

      let dapprVal = 0, dapprBills = 0, dapprQty = 0;
      if (includeDappr && dapprPeriodForStore.length === 0 && !isGMGRoad) {
        const storeKey = normalizeForMatch(name);
        if (isStoreAdmin && dapprAttribution) {
          dapprVal = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.billWtd) || 0), 0);
          dapprBills = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.valWtd) || 0), 0);
          dapprQty = Object.values(dapprAttribution).reduce((s, v) => s + (Number(v.qtyWtd) || 0), 0);
        } else if (storeDapprTotals && storeDapprTotals[storeKey]) {
          dapprVal = storeDapprTotals[storeKey].val || 0;
          dapprBills = storeDapprTotals[storeKey].bills || 0;
          dapprQty = storeDapprTotals[storeKey].qty || 0;
        }
      }

      const value = rentalVal + shoeVal + custVal + dapprVal;
      const bills = rentalBills + shoeBills + custBills + dapprBills;
      const qty = rentalQty + shoeQty + custQty + dapprQty;

      totalStoresValue += value;

      const chartItem = chartData.find(c => normalizeForMatch(c.name) === normalizeForMatch(name));
      const targetAchieved = chartItem ? Math.round(chartItem.pct) : 0;

      const abs = bills > 0 ? parseFloat((qty / bills).toFixed(1)) : 0.0;
      const abv = bills > 0 ? Math.round(value / bills) : 0;

      const bObj = branches.find(br => (br._id && String(br._id) === String(b?._id)) || normalizeForMatch(br.workingBranch) === normalizeForMatch(name));
      const storeWalkins = walkins.filter(w => 
        (w.storeId === bObj?._id || String(w.storeId) === String(bObj?._id) || w.store === bObj?.workingBranch || (w.store && bObj?.workingBranch && normalizeForMatch(w.store) === normalizeForMatch(bObj.workingBranch)) || normalizeForMatch(w.store) === normalizeForMatch(name)) && 
        isWalkinCreatedInRange(w.createdAt, periodStart, periodEnd)
      ).length;
      const conversion = storeWalkins > 0 ? Math.round((bills / storeWalkins) * 100) : 0;

      return { name, targetAchieved, value, abs, abv, conversion };
    });

    return storeMetrics.map(item => {
      const contribution = totalStoresValue > 0 ? Math.round((item.value / totalStoresValue) * 100) : 0;
      return {
        name: item.name,
        targetAchieved: item.targetAchieved,
        contribution,
        abs: item.abs,
        abv: item.abv,
        conversion: item.conversion
      };
    });
  }, [branches, chartData, selectedStreams, performanceData, walkins, isStoreAdmin, isClusterAdmin, salesData, salespersons, dapprAttribution, customizationAttribution, storeDapprTotals, storeCustomizationTotals, selectedClusters, selectedStores, clusters, periodStart, periodEnd, systemEmpNameToCodeMap, systemEmpCodeToNameMap]);

  const processedRanking = useMemo(() => {
    const showStaffRanking = isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"));
    let result = [...rankingData];
    
    if (showStaffRanking) {
      result = result.filter(s => {
        if (!s || !s.name) return false;
        const lower = s.name.trim().toLowerCase();
        if (lower === 'store total' || lower === 'store_total' || lower === 'store-total' || lower === 'total' || lower === 'unassigned') return false;
        const norm = normalizeForMatch(s.name);
        if (branches && branches.some(b => normalizeForMatch(b.workingBranch) === norm || normalizeForMatch(displayBranchName(b.workingBranch)) === norm)) return false;
        if (lower.startsWith('suitor guy') || lower.startsWith('zorucci') || lower.startsWith('dappr squad') || lower === 'office' || lower === 'production' || lower === 'warehouse') return false;
        return true;
      });
    }

    if (rankingSearch.trim()) {
      const q = rankingSearch.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    
    result.sort((a, b) => {
      const contribA = Number(a.contribution) || 0;
      const contribB = Number(b.contribution) || 0;
      if (contribA !== contribB) {
        return rankingSort === "Best to Least" ? contribB - contribA : contribA - contribB;
      }
      const valA = Number(a.value ?? a.targetAchieved) || 0;
      const valB = Number(b.value ?? b.targetAchieved) || 0;
      if (valA !== valB) {
        return rankingSort === "Best to Least" ? valB - valA : valA - valB;
      }
      return rankingSort === "Best to Least"
        ? (Number(b.targetAchieved) || 0) - (Number(a.targetAchieved) || 0)
        : (Number(a.targetAchieved) || 0) - (Number(b.targetAchieved) || 0);
    });
    
    return result;
  }, [rankingData, rankingSearch, rankingSort]);

  // Dynamic Operational Highlights calculations
  const operationalHighlights = useMemo(() => {
    const highlights = [];

    const showStaffRanking = isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All"));
    if (showStaffRanking) {
      // 1. Lowest Performing Employee (target)
      const activeEmployeesData = [...employeeChartData];
      if (activeEmployeesData.length > 0) {
        const sortedByPct = [...activeEmployeesData].sort((a, b) => a.pct - b.pct);
        const worstEmp = sortedByPct[0];
        if (worstEmp && worstEmp.pct < 90) {
          highlights.push({
            type: "lowest_performing_employee",
            title: "Performance Attention Required",
            description: `${worstEmp.name} achieved only ${worstEmp.pct}% of target, ranking lowest among the store staff.`,
            location: worstEmp.name,
            meta: `${worstEmp.pct}% of target`,
            severity: "amber"
          });
        }

        // 2. Lowest Conversion Employee
        const staffRanking = [...rankingData].sort((a, b) => a.conversion - b.conversion);
        const worstConvStaff = staffRanking.find(s => s.conversion > 0);
        if (worstConvStaff && worstConvStaff.conversion < 75) {
          highlights.push({
            type: "low_conversion_employee",
            title: "Conversion Improvement Opportunity",
            description: `${worstConvStaff.name}'s customer conversion rate is at ${worstConvStaff.conversion}%, suggesting potential gaps in sales closure.`,
            location: worstConvStaff.name,
            meta: `${worstConvStaff.conversion}% conversion`,
            severity: "red"
          });
        }

        // 3. Low ABV Employee
        const staffWithAbv = [...rankingData].filter(s => s.abv > 0).sort((a, b) => a.abv - b.abv);
        const lowestAbvStaff = staffWithAbv[0];
        const avgAbv = staffWithAbv.length > 0 ? Math.round(staffWithAbv.reduce((s, x) => s + x.abv, 0) / staffWithAbv.length) : 0;
        if (lowestAbvStaff && avgAbv > 0 && lowestAbvStaff.abv < avgAbv * 0.7) {
          highlights.push({
            type: "low_abv_employee",
            title: "Low Average Basket Value",
            description: `${lowestAbvStaff.name} has an ABV of ₹${lowestAbvStaff.abv.toLocaleString()} vs store avg ₹${avgAbv.toLocaleString()}. Upselling opportunities being missed.`,
            location: lowestAbvStaff.name,
            meta: `ABV ₹${lowestAbvStaff.abv.toLocaleString()}`,
            severity: "amber"
          });
        }

        // 4. Low ABS Employee
        const staffWithAbs = [...rankingData].filter(s => s.abs > 0).sort((a, b) => a.abs - b.abs);
        const lowestAbsStaff = staffWithAbs[0];
        const avgAbs = staffWithAbs.length > 0 ? parseFloat((staffWithAbs.reduce((s, x) => s + x.abs, 0) / staffWithAbs.length).toFixed(1)) : 0;
        if (lowestAbsStaff && avgAbs > 0 && lowestAbsStaff.abs < avgAbs * 0.7) {
          highlights.push({
            type: "low_abs_employee",
            title: "Low Average Basket Size",
            description: `${lowestAbsStaff.name} is averaging ${lowestAbsStaff.abs} items/bill vs store avg ${avgAbs}. Review cross-selling techniques.`,
            location: lowestAbsStaff.name,
            meta: `ABS ${lowestAbsStaff.abs} items/bill`,
            severity: "blue"
          });
        }
      }
    } else {
      // Admin / Cluster Admin view (Store-level highlights)

      // 1. Lowest Performing Store (target %)
      const activeStores = [...filteredStoresForKPIs].sort((a, b) => a.pct - b.pct);
      if (activeStores.length > 0) {
        const lowestStore = activeStores[0];
        if (lowestStore.pct < 90) {
          highlights.push({
            type: "lowest_performing_store",
            title: "Lowest Performing Store",
            description: `Store achieved only ${lowestStore.pct}% of target and ranks last among all stores in the selection.`,
            location: lowestStore.name,
            meta: `${lowestStore.pct}% of target`,
            severity: "amber"
          });

          // --- Drill-in: find worst staff in the underperforming store ---
          const underBranch = branches.find(b => normalizeForMatch(b.workingBranch) === normalizeForMatch(lowestStore.name));
          if (underBranch) {
            const locId = getBranchLocationId(underBranch.workingBranch);
            const staffList = performanceData[locId] || [];
            if (staffList.length > 0) {
              const storeTotalVal = staffList.reduce((s, x) => s + (x.totalValue || 0), 0);
              const worstStaff = [...staffList].sort((a, b) => (a.totalValue || 0) - (b.totalValue || 0))[0];
              if (worstStaff) {
                const staffPct = storeTotalVal > 0 ? Math.round(((worstStaff.totalValue || 0) / storeTotalVal) * 100) : 0;
                highlights.push({
                  type: "underperforming_employee_in_store",
                  title: "Underperforming Employee Detected",
                  description: `In ${lowestStore.name}, ${worstStaff.bookingBy} contributes only ${staffPct}% of store revenue — the lowest among all staff.`,
                  location: `${lowestStore.name} → ${worstStaff.bookingBy}`,
                  meta: `₹${(worstStaff.totalValue || 0).toLocaleString()} revenue`,
                  severity: "red"
                });
              }
            }
          }
        }
      }

      // 2. High Footfall, Low Sales (Lowest Conversion Rate)
      const sortedByConversion = [...rankingData]
        .filter(s => s.conversion > 0)
        .sort((a, b) => a.conversion - b.conversion);
      if (sortedByConversion.length > 0) {
        const lowestConvStore = sortedByConversion[0];
        if (lowestConvStore.conversion < 75) {
          highlights.push({
            type: "high_footfall_low_sales",
            title: "High Footfall, Low Sales",
            description: `Customer conversion remains below expectations at ${lowestConvStore.name}. Opportunity loss detected.`,
            location: lowestConvStore.name,
            meta: `${lowestConvStore.conversion}% conversion`,
            severity: "red"
          });
        }
      }

      // 3. Lowest ABV Store
      const storesWithAbv = [...rankingData].filter(s => s.abv > 0).sort((a, b) => a.abv - b.abv);
      const lowestAbvStore = storesWithAbv[0];
      const avgAbv = storesWithAbv.length > 0 ? Math.round(storesWithAbv.reduce((s, x) => s + x.abv, 0) / storesWithAbv.length) : 0;
      if (lowestAbvStore && avgAbv > 0 && lowestAbvStore.abv < avgAbv * 0.75) {
        highlights.push({
          type: "low_abv_store",
          title: "Below-Average Basket Value",
          description: `${lowestAbvStore.name} has the lowest ABV at ₹${lowestAbvStore.abv.toLocaleString()} vs network avg ₹${avgAbv.toLocaleString()}. Focus on upselling premium items.`,
          location: lowestAbvStore.name,
          meta: `ABV ₹${lowestAbvStore.abv.toLocaleString()}`,
          severity: "amber"
        });
      }

      // 4. Lowest ABS Store
      const storesWithAbs = [...rankingData].filter(s => s.abs > 0).sort((a, b) => a.abs - b.abs);
      const lowestAbsStore = storesWithAbs[0];
      const avgAbs = storesWithAbs.length > 0 ? parseFloat((storesWithAbs.reduce((s, x) => s + x.abs, 0) / storesWithAbs.length).toFixed(1)) : 0;
      if (lowestAbsStore && avgAbs > 0 && lowestAbsStore.abs < avgAbs * 0.75) {
        highlights.push({
          type: "low_abs_store",
          title: "Low Items Per Bill",
          description: `${lowestAbsStore.name} averages only ${lowestAbsStore.abs} items/bill vs network avg ${avgAbs}. Bundling and cross-sell training recommended.`,
          location: lowestAbsStore.name,
          meta: `ABS ${lowestAbsStore.abs} items/bill`,
          severity: "blue"
        });
      }
    }

    // Default fallback
    if (highlights.length === 0) {
      highlights.push({
        type: "info",
        title: "All Stores Performing Well",
        description: "All stores/staff are achieving their targets with healthy conversion rates. Keep up the great work!",
        location: "System-wide",
        meta: "100% healthy",
        severity: "blue"
      });
    }

    return highlights;
  }, [isStoreAdmin, selectedStores, branches, employees, employeeChartData, rankingData, filteredStoresForKPIs, performanceData]);

  const itemsPerPageRanking = 6;
  const totalRankingItems = processedRanking.length;
  
  const paginatedRanking = useMemo(() => {
    const start = (rankingPage - 1) * itemsPerPageRanking;
    return processedRanking.slice(start, start + itemsPerPageRanking);
  }, [processedRanking, rankingPage]);

  const renderKpiChangeDetails = (changeObj, isCurrency = false, isFloat = false) => {
    if (!changeObj) return null;
    const tyVal = isCurrency 
      ? `₹${formatIndianNumber(changeObj.curr, 0)}` 
      : isFloat 
        ? changeObj.curr.toFixed(1) 
        : formatIndianNumber(changeObj.curr);
    
    const lyVal = isCurrency 
      ? `₹${formatIndianNumber(changeObj.prev || 0, 0)}` 
      : isFloat 
        ? (changeObj.prev || 0).toFixed(1) 
        : formatIndianNumber(changeObj.prev || 0);

    const diffVal = isCurrency 
      ? `₹${formatIndianNumber(Math.abs(changeObj.diff || 0), 0)}` 
      : isFloat 
        ? Math.abs(changeObj.diff || 0).toFixed(1) 
        : formatIndianNumber(Math.abs(changeObj.diff || 0));

    const diffPrefix = changeObj.diff >= 0 ? "+" : "-";
    const diffColor = changeObj.diff >= 0 ? "text-emerald-600" : "text-rose-500";

    return (
      <div className="text-[11px] font-semibold text-gray-500 font-sans mt-1.5 flex flex-col gap-0.5 leading-tight">
        <div>TY ({timeframe}): <span className="font-bold text-gray-800">{tyVal}</span></div>
        <div>LY ({timeframe}): <span className="font-bold text-gray-800">{lyVal}</span></div>
        <div>Diff: <span className={`font-bold ${diffColor}`}>{diffPrefix}{diffVal}</span></div>
      </div>
    );
  };

  const renderKpiComparisonBadge = (changeObj, unit = "") => {
    if (!changeObj) return null;
    const isUp = changeObj.diff >= 0;
    
    // Formatted absolute difference
    let absDiff = Math.abs(changeObj.diff);
    let diffStr = "";
    if (unit === "currency") {
      diffStr = `₹${formatIndianNumber(absDiff, 0)}`;
    } else if (unit === "float" || unit === "Basket Size") {
      diffStr = absDiff.toFixed(1);
    } else {
      diffStr = formatIndianNumber(absDiff);
    }

    // Add prefix/suffix
    const sign = isUp ? "+" : "-";
    let text = "";
    if (unit === "currency") {
      text = `${sign}${diffStr}`;
    } else if (unit === "pts") {
      text = `${sign}${diffStr} pts`;
    } else if (unit === "Walk-ins") {
      text = `${sign}${diffStr} Customers`;
    } else if (unit === "Basket Size") {
      text = `${sign}${diffStr} Items`;
    } else if (unit === "Shoes") {
      text = `${sign}${diffStr} Pairs`;
    } else if (unit === "Shirts") {
      text = `${sign}${diffStr} Shirts`;
    } else if (unit === "Bills") {
      text = `${sign}${diffStr} Bills`;
    } else if (unit === "Reviews") {
      text = `${sign}${diffStr} Reviews`;
    } else {
      text = `${sign}${diffStr}`;
    }

    const percentage = changeObj.display; // e.g. "+11.8%" or "-5.9%"
    
    const badgeBg = isUp ? "bg-emerald-50 text-emerald-700 font-sans" : "bg-rose-50 text-rose-600 font-sans";
    const arrow = isUp ? "↗" : "↘";

    return (
      <div className={`mt-3 py-1.5 px-3 rounded-xl flex items-center justify-center text-[11.5px] font-bold ${badgeBg}`}>
        <span className="flex items-center gap-1.5">
          <span>{arrow}</span>
          <span>{text}</span>
        </span>
      </div>
    );
  };

  const renderKpiCard = ({ title, mainVal, tyVal, lyVal, changeObj, unit, trend, trendColor, label1 = "This Year :", label2 = "Last Year :", index = 0, subBadge = null }) => {
    const isUp = (changeObj && changeObj.diff > 0) || trend === "up";
    const isDown = (changeObj && changeObj.diff < 0) || trend === "down";
    const finalTrendColor = trendColor || (changeObj && changeObj.trendColor) || (isUp ? "#00A36C" : (isDown ? "#e11d48" : "#6b7280"));
    const finalTrend = trend || (changeObj && changeObj.trend) || (isUp ? "up" : (isDown ? "down" : "neutral"));
    const isNegative = (typeof mainVal === "string" && mainVal.startsWith("-")) || (changeObj && changeObj.diff < 0);
    const isPositive = (typeof mainVal === "string" && mainVal.startsWith("+")) || (changeObj && changeObj.diff > 0);
    const mainTextColor = isNegative ? "text-rose-600" : (isPositive ? "text-emerald-600" : "text-gray-700");
    return (
      <div 
        style={{ animationDelay: `${index * 45}ms` }}
        className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 flex flex-col justify-between h-[200px] w-full font-sans transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-200/80 group cursor-pointer animate-slideUpFade"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors block">{title}</span>
          {subBadge && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100/80 shadow-xs">
              {subBadge}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[28px] xs:text-[30px] sm:text-[32px] font-extrabold ${mainTextColor} leading-none transition-transform duration-300 group-hover:scale-[1.03] origin-left`}>{mainVal}</span>
          <Sparkline type={finalTrend} color={finalTrendColor} />
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-gray-400 font-semibold">{label1}</span>
            <span className="text-gray-800 font-bold truncate max-w-[170px] text-right" title={String(tyVal)}>{tyVal}</span>
          </div>
          <div className="flex justify-between items-center text-[12px]">
            <span className="text-gray-400 font-semibold">{label2}</span>
            <span className="text-gray-800 font-bold truncate max-w-[170px] text-right" title={String(lyVal)}>{lyVal}</span>
          </div>
        </div>
        {renderKpiComparisonBadge(changeObj, unit)}
      </div>
    );
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f3f4f6] text-gray-800 animate-fadeIn" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* SideNav desktop */}
      <SideNav />
      
      {/* Mobile navigation */}
      <div className="md:hidden">
        <ModileNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[110px] min-h-screen p-4 sm:p-6 lg:p-8 mb-[70px] md:mb-0">
        {/* Top Welcome Banner */}
        <div className="mb-6">
          <WelcomeBanner />
        </div>

        <style>{`
          @keyframes slideUpFade {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-slideUpFade {
            animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes popoverOpen {
            0% {
              opacity: 0;
              transform: scale(0.94) translateY(-6px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .animate-popoverOpen {
            animation: popoverOpen 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
        
        {/* Top Header Controls row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Store Performance Overview</h1>
            <p className="text-gray-500 text-[13px] mt-0.5 font-medium font-sans">Key performance metrics and trends across stores.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Revenue Stream Segmented Selector with Popover */}
            <div className="relative" ref={streamDropdownRef}>
              <div className="relative inline-flex items-center bg-[#e5e7eb] dark:bg-gray-800 p-0.5 rounded-full shadow-inner select-none border border-gray-200/60 dark:border-gray-700/50">
                {/* 1. Rental Preset */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStreams(["rental"]);
                    setIsStreamDropdownOpen(false);
                  }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all duration-200 cursor-pointer select-none ${
                    isRentalOnly
                      ? "bg-white text-gray-950 shadow-md shadow-black/10 scale-[1.02] border border-black/5"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Rental
                </button>

                {/* 2. Consolidated Preset */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStreams([...CONSOLIDATED_STREAMS]);
                    setIsStreamDropdownOpen(false);
                  }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all duration-200 cursor-pointer select-none ${
                    isConsolidated
                      ? "bg-white text-gray-950 shadow-md shadow-black/10 scale-[1.02] border border-black/5"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Consolidated
                </button>

                {/* 3. Custom Stream Selector Trigger */}
                <button
                  type="button"
                  onClick={() => setIsStreamDropdownOpen(!isStreamDropdownOpen)}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition-all duration-200 cursor-pointer select-none ${
                    !isRentalOnly && !isConsolidated
                      ? "bg-white text-gray-950 shadow-md shadow-black/10 scale-[1.02] border border-black/5"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <span>
                    {!isRentalOnly && !isConsolidated ? `Custom (${selectedStreams.length})` : "Customize"}
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isStreamDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Streams Selection Popover Dropdown */}
              {isStreamDropdownOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-84 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/90 z-50 animate-popoverOpen overflow-hidden p-3 origin-top-right">
                  {/* Popover Header */}
                  <div className="pb-3 mb-2 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs shadow-xs">
                        📊
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-900 leading-tight">Revenue Streams</h4>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {selectedStreams.length} of {ALL_STREAMS.length} active
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedStreams([...CONSOLIDATED_STREAMS])}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          isConsolidated
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Consolidated (3)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStreams(ALL_STREAMS.map(s => s.id))}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          isAllStreams
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        All (4)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStreams(["rental"])}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          isRentalOnly
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Rental Only
                      </button>
                    </div>
                  </div>

                  {/* Popover Stream Items */}
                  <div className="space-y-1.5 mb-2">
                    {ALL_STREAMS.map((stream) => {
                      const isSelected = selectedStreams.includes(stream.id);
                      return (
                        <div
                          key={stream.id}
                          onClick={() => {
                            if (isSelected) {
                              if (selectedStreams.length > 1) {
                                setSelectedStreams(selectedStreams.filter(id => id !== stream.id));
                              }
                            } else {
                              setSelectedStreams([...selectedStreams, stream.id]);
                            }
                          }}
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 border select-none ${
                            isSelected
                              ? `${stream.activeBg} ${stream.activeBorder} shadow-xs`
                              : "bg-gray-50/50 border-gray-100/70 hover:bg-gray-100/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Stream Avatar Icon */}
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 shadow-xs"
                              style={{ backgroundColor: `${stream.color}20` }}
                            >
                              {stream.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-black tracking-tight ${isSelected ? "text-gray-900" : "text-gray-600"}`}>
                                  {stream.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-medium truncate">
                                {stream.desc}
                              </p>
                            </div>
                          </div>

                          {/* Custom Checkbox */}
                          <div className="pl-2 shrink-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-gray-950 text-white shadow-xs"
                                  : "border border-gray-300 bg-white group-hover:border-gray-400"
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Popover Footer Info */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                      <span>⚡</span> Recalculates in real-time
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsStreamDropdownOpen(false)}
                      className="px-3 py-1 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timeframe selector */}
            <SegmentedControl
              options={["MTD", "WTD", "YTD", "CUSTOM"]}
              value={timeframe}
              onChange={(val) => setTimeframe(val)}
            />

            {timeframe === "CUSTOM" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm hover:border-gray-300 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-extrabold text-gray-800">
                    {(() => {
                      if (!customStartDate || !customEndDate) return "Select Date Range";
                      const p1 = customStartDate.split("-");
                      const p2 = customEndDate.split("-");
                      if (p1.length === 3 && p2.length === 3) {
                        return `${p1[1]}/${p1[2]}/${p1[0]} – ${p2[1]}/${p2[2]}/${p2[0]}`;
                      }
                      return `${customStartDate} – ${customEndDate}`;
                    })()}
                  </span>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCalendarOpen && (
                  <SingleCalendarRangePicker
                    initialStart={customStartDate}
                    initialEnd={customEndDate}
                    onApply={(start, end) => {
                      setCustomStartDate(start);
                      setCustomEndDate(end);
                      setTempStartDate(start);
                      setTempEndDate(end);
                      setIsCalendarOpen(false);
                    }}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                )}
              </div>
            )}

            {/* Date label */}
            <span className="text-gray-500 text-xs font-semibold select-none border-l border-gray-300 pl-4 py-1 font-sans">
              {getTodayDateHeaderString()}
            </span>
          </div>
        </div>

        {/* Store Target vs Achieved Target / LY vs TY Chart Card */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-[16px] sm:text-[17px] font-bold text-gray-900 leading-snug">
                {graphType === "LY_VS_TY" 
                  ? (isStoreAdmin ? "Employee Last Year Vs This Year" : "Store Last Year Vs This Year")
                  : (isStoreAdmin ? "Employee Performance Overview" : "Store Target Vs Achieved Target")
                }
              </h2>
              <p className="text-gray-400 text-[11px] sm:text-xs font-semibold font-sans mt-0.5">
                {timeframe === "MTD"
                  ? getMTDDateRangeString()
                  : timeframe === "WTD"
                    ? getWTDDateRangeString()
                    : timeframe === "YTD"
                      ? getYTDDateRangeString()
                      : getCustomDateRangeString()
                } | {isStoreAdmin
                  ? `${employeeChartData.length} employee${employeeChartData.length !== 1 ? "s" : ""}`
                  : `Comparison across all ${filteredChartData.length} stores`
                }
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Graph Mode Switcher Toggle (Target vs Achieved | LY / TY) */}
              <SegmentedControl
                options={[
                  { key: "TARGET_VS_ACHIEVED", label: "Target vs Achieved" },
                  { key: "LY_VS_TY", label: "LY / TY" }
                ]}
                value={graphType}
                onChange={(val) => setGraphType(val)}
              />

              {/* Category selector pills — only for non-store-admin */}
              {!isStoreAdmin && (
                <SegmentedControl
                  options={["All", "On Track", "At Risk"]}
                  value={chartFilter}
                  onChange={(val) => setChartFilter(val)}
                />
              )}

              {/* View Report Button */}
              <a 
                href="/store-analysis/dsr-report" 
                className="bg-[#18181b] hover:bg-black text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-colors select-none text-center"
              >
                View Report
              </a>
            </div>
          </div>

          {/* Chart Legends */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 text-[11px] sm:text-xs font-bold text-gray-500 font-sans">
            {graphType === "LY_VS_TY" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
                  <span>Last Year (LY)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>This Year (TY) - Growth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
                  <span>This Year (TY) - Degrowth</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
                  <span>Target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Achieved (Target Met)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
                  <span>Achieved (Target Missed)</span>
                </div>
              </>
            )}
          </div>

          {/* Recharts Graph Container with Mobile Scrollability */}
          <div className="w-full overflow-x-auto mt-2 pb-2">
            <div className="h-[280px] sm:h-[320px] min-w-[640px] md:min-w-full relative">
              {loadingPerformance && (
                <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center transition-all duration-500 overflow-hidden font-sans">
                  {/* Top Sweeping Laser Beam (Linear / Vercel Style) */}
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gray-100/60 overflow-hidden">
                    <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-laserBeam" />
                  </div>

                  {/* High-Level Vertical Shimmer Skeleton Wave */}
                  <div className="absolute inset-x-8 bottom-8 top-12 flex items-end justify-between gap-3 opacity-20 pointer-events-none">
                    {[45, 70, 35, 90, 55, 80, 40, 95, 60, 75, 50, 85, 30, 65, 100, 45].map((h, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-gradient-to-t from-gray-900 via-gray-700 to-emerald-600 rounded-t-sm relative overflow-hidden"
                        style={{ height: `${h}%` }}
                      >
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-transparent via-white/50 to-transparent animate-shimmer"
                          style={{ animationDelay: `${(idx % 4) * 200}ms` }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Floating Glassmorphic Badge with Pulsing Emerald Radar Orb */}
                  <div className="relative z-40 flex flex-col items-center gap-2.5 bg-white/95 border border-gray-200/90 shadow-2xl px-6 py-4 rounded-2xl backdrop-blur-xl animate-float">
                    <div className="flex items-center gap-3">
                      {/* Pulsing Emerald Radar Orb */}
                      <div className="relative flex items-center justify-center w-4 h-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                      </div>

                      <span className="text-xs font-bold text-gray-900 tracking-wide font-sans">
                        Syncing Store Analytics
                      </span>

                      {/* Bouncing Micro Dots */}
                      <div className="flex gap-1 items-center ml-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-gray-400">
                      Processing live revenue & target data
                    </span>
                  </div>

                  <style>{`
                    @keyframes laserBeam {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(280%); }
                    }
                    .animate-laserBeam {
                      animation: laserBeam 1.6s infinite ease-in-out;
                    }
                    @keyframes shimmer {
                      0% { transform: translateY(100%); }
                      100% { transform: translateY(-100%); }
                    }
                    .animate-shimmer {
                      animation: shimmer 1.8s infinite ease-in-out;
                    }
                    @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-3px); }
                    }
                    .animate-float {
                      animation: float 2.5s ease-in-out infinite;
                    }
                  `}</style>
                </div>
              )}
              {isStoreAdmin && employeeChartData.length === 0 && !loadingPerformance && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm font-semibold">
                  No employee performance data available for this period.
                </div>
              )}
              {(!isStoreAdmin || employeeChartData.length > 0 || loadingPerformance) && (() => {
                const rawChartPoints = isStoreAdmin ? employeeChartData : filteredChartData;
                const chartPoints = rawChartPoints.map((pt) => ({
                  ...pt,
                  ly: Math.max(0, pt.ly || 0),
                  ty: Math.max(0, pt.ty !== undefined ? pt.ty : (pt.achieved || 0)),
                  target: Math.max(0, pt.target || 0),
                  achieved: Math.max(0, pt.achieved || 0),
                  rawLy: pt.ly || 0,
                  rawTy: pt.ty !== undefined ? pt.ty : (pt.achieved || 0),
                }));

                // Shared tooltip content
                const sharedTooltip = (
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (graphType === "LY_VS_TY") {
                          const lyVal = data.rawLy !== undefined ? data.rawLy : (data.ly || 0);
                          const tyVal = data.rawTy !== undefined ? data.rawTy : (data.ty !== undefined ? data.ty : (data.achieved || 0));
                          const diff = tyVal - lyVal;
                          const pctGrowth = lyVal > 0 ? ((diff / lyVal) * 100).toFixed(1) : (tyVal > 0 ? "100" : "0");
                          const isDegrowth = tyVal < lyVal;
                          const diffPrefix = diff >= 0 ? "+" : "-";
                          const diffColor = isDegrowth ? "text-rose-500" : "text-emerald-600";
                          const tyColor = isDegrowth ? "text-rose-600" : "text-emerald-600";
                          return (
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xl text-xs font-sans">
                              <h4 className="font-extrabold text-gray-900 text-sm mb-2">{data.name}</h4>
                              <div className="space-y-1 font-semibold text-gray-500">
                                <div className="flex items-center justify-between gap-6">
                                  <span>Last Year (LY) :</span>
                                  <span className="text-[#475569] font-extrabold">₹{formatIndianNumber(lyVal, 2)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-6">
                                  <span>This Year (TY) :</span>
                                  <span className={`${tyColor} font-extrabold`}>₹{formatIndianNumber(tyVal, 2)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-6 border-t border-gray-100 pt-1.5 mt-1.5">
                                  <span>Growth / Diff :</span>
                                  <span className={`font-extrabold ${diffColor}`}>
                                    {diffPrefix}₹{formatIndianNumber(Math.abs(diff), 2)} ({diffPrefix}{pctGrowth}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const targetVal = data.target || 0;
                        const achievedVal = data.achieved || 0;
                        const isTargetMet = targetVal > 0 ? achievedVal >= targetVal : achievedVal > 0;
                        const achievedColor = isTargetMet ? "text-emerald-600" : "text-rose-600";

                        return (
                          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xl text-xs font-sans">
                            <h4 className="font-extrabold text-gray-900 text-sm mb-2">{data.name}</h4>
                            <div className="space-y-1 font-semibold text-gray-500">
                              <div className="flex items-center justify-between gap-6">
                                <span>Target :</span>
                                <span className="text-[#475569] font-extrabold">
                                  {targetVal > 0 ? `₹${formatIndianNumber(targetVal, 2)}` : "—"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span>Achieved :</span>
                                <span className={`${achievedColor} font-extrabold`}>₹{formatIndianNumber(achievedVal, 2)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-6 border-t border-gray-100 pt-1.5 mt-1.5">
                                <span>Balance / Shortfall :</span>
                                <span className={`font-extrabold ${data.balance <= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {targetVal > 0 ? `₹${formatIndianNumber(data.balance, 2)}` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                );

                const sharedAxes = (
                  <>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="abbr"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 9, fontWeight: 700 }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 9, fontWeight: 700 }}
                      tickFormatter={(val) => {
                        if (val <= 0) return "0";
                        if (val >= 1000000) return `${val / 1000000}M`;
                        if (val >= 1000) return `${val / 1000}K`;
                        return `${val}`;
                      }}
                    />
                  </>
                );

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={3} barCategoryGap="30%">
                      {sharedAxes}
                      {sharedTooltip}
                      {graphType === "LY_VS_TY" ? (
                        <>
                          <Bar dataKey="ly" name="Last Year (LY)" fill="#475569" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="ty" name="This Year (TY)" radius={[0, 0, 0, 0]}>
                            {chartPoints.map((entry, index) => {
                              const lyVal = entry.ly || 0;
                              const tyVal = entry.ty !== undefined ? entry.ty : (entry.achieved || 0);
                              const isDegrowth = tyVal < lyVal;
                              return (
                                <Cell 
                                  key={`cell-ty-${index}`} 
                                  fill={isDegrowth ? "#e11d48" : "#10b981"} 
                                />
                              );
                            })}
                          </Bar>
                        </>
                      ) : (
                        <>
                          <Bar dataKey="target" name="Target" fill="#475569" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
                          <Bar dataKey="achieved" name="Achieved" radius={[0, 0, 0, 0]}>
                            {chartPoints.map((entry, index) => {
                              const targetVal = entry.target || 0;
                              const achievedVal = entry.achieved || 0;
                              const isTargetMet = targetVal > 0 ? achievedVal >= targetVal : achievedVal > 0;
                              return (
                                <Cell 
                                  key={`cell-achieved-${index}`} 
                                  fill={isTargetMet ? "#10b981" : "#e11d48"} 
                                />
                              );
                            })}
                          </Bar>
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 12 KPI Grid Container boxed in a box */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 mb-6">
          
          {/* Header Row with Role and Cluster Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 font-sans">
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 leading-tight">Key Performance Indicators</h2>
              <p className="text-gray-400 text-[12px] mt-0.5 font-medium">
                {timeframe === "MTD"
                  ? getMTDDateRangeString()
                  : timeframe === "WTD"
                    ? getWTDDateRangeString()
                    : timeframe === "YTD"
                      ? getYTDDateRangeString()
                      : getCustomDateRangeString()
                }
              </p>
            </div>
            
            {!isStoreAdmin && (
              <div className="flex items-center gap-4">
                {!isClusterAdmin && (
                  <>
                    {/* Role Badge / Dropdown */}
                    {isSuperAdmin ? (
                      <div className="bg-white border border-gray-200/90 rounded-[14px] px-4 py-2 text-[13px] font-bold text-gray-800 shadow-sm flex items-center gap-2 select-none">
                        <span>Role : {user?.role === "admin" ? "Admin" : "Super Admin"}</span>
                      </div>
                    ) : (
                      <div ref={roleDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                          className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-[14px] px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[145px] transition-all"
                        >
                          <span>Role : {roleFilter}</span>
                          <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isRoleDropdownOpen && (
                          <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100/90 z-50 p-1.5 text-xs font-sans animate-popoverOpen origin-top-right">
                            {["Cluster", "Store Admin", "Super Admin"].map((r) => {
                              const isSelected = roleFilter === r;
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => {
                                    setRoleFilter(r);
                                    setIsRoleDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isSelected ? "bg-gray-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <span>Role : {r}</span>
                                  {isSelected && (
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multi-Select Cluster Dropdown */}
                    <div ref={clusterDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
                        className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-[14px] px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[160px] transition-all"
                      >
                        <span>
                          {selectedClusters.includes("All") || selectedClusters.length === 0
                            ? "Cluster : All"
                            : selectedClusters.length === 1
                              ? `Cluster : ${clusters.find(c => String(c._id) === String(selectedClusters[0]))?.name || "1 Selected"}`
                              : `Clusters (${selectedClusters.length})`
                          }
                        </span>
                        <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isClusterDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isClusterDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100/90 z-50 p-2 text-xs font-sans animate-popoverOpen origin-top-right">
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
                  </>
                )}

                {/* Multi-Select Store Dropdown — visible to both Super Admin and Cluster Admin when stores are available */}
                {storeOptionsForFilter.length > 0 && (
                  <div ref={storeDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                      className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-[14px] px-4 py-2 text-[13px] font-bold text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none cursor-pointer min-w-[150px] transition-all"
                    >
                      <span>
                        {selectedStores.includes("All") || selectedStores.length === 0
                          ? "Store : All"
                          : selectedStores.length === 1
                            ? `Store : ${selectedStores[0]}`
                            : `Stores (${selectedStores.length})`
                        }
                      </span>
                      <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isStoreDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isStoreDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100/90 z-50 p-2 text-xs font-sans animate-popoverOpen origin-top-right">
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
                          {storeOptionsForFilter.map((name) => {
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
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {stats && (<>
          {renderKpiCard({
            title: "Customer Walk-ins",
            mainVal: stats.walkChange?.display || "+0%",
            tyVal: formatIndianNumber(stats.customerWalkins),
            lyVal: formatIndianNumber(stats.walkChange?.prev || 0),
            changeObj: stats.walkChange,
            unit: "Walk-ins",
            trend: stats.walkTrend,
            trendColor: stats.walkTrendColor,
            index: 1
          })}

          {renderKpiCard({
            title: "Bills Generated",
            mainVal: stats.billsChange?.display || "+0%",
            tyVal: formatIndianNumber(stats.billsGenerated),
            lyVal: formatIndianNumber(stats.billsChange?.prev || 0),
            changeObj: stats.billsChange,
            unit: "Bills",
            trend: stats.billsTrend,
            trendColor: stats.billsTrendColor,
            index: 2
          })}

          {renderKpiCard({
            title: "Quantity Sold",
            mainVal: stats.qtyChange?.display || "+0%",
            tyVal: formatIndianNumber(stats.quantitySold),
            lyVal: formatIndianNumber(stats.qtyChange?.prev || 0),
            changeObj: stats.qtyChange,
            unit: "",
            trend: stats.qtyTrend,
            trendColor: stats.qtyTrendColor,
            index: 3
          })}

          {renderKpiCard({
            title: "Value Generated",
            mainVal: stats.valChange?.display || "+0%",
            tyVal: `₹${formatIndianNumber(stats.achievedValue, 0)}`,
            lyVal: `₹${formatIndianNumber(stats.valChange?.prev || 0, 0)}`,
            changeObj: stats.valChange,
            unit: "currency",
            trend: stats.valTrend,
            trendColor: stats.valTrendColor,
            index: 4
          })}

          {renderKpiCard({
            title: "Average Basket Size",
            mainVal: stats.absChange?.display || "+0%",
            tyVal: `${parseFloat(stats.basketSize || 0).toFixed(1)} Items`,
            lyVal: `${(stats.absChange?.prev || 0).toFixed(1)} Items`,
            changeObj: stats.absChange,
            unit: "Basket Size",
            trend: stats.absTrend,
            trendColor: stats.absTrendColor,
            index: 5
          })}

          {renderKpiCard({
            title: "Average Basket Value",
            mainVal: stats.abvChange?.display || "+0%",
            tyVal: `₹${formatIndianNumber(stats.basketValue, 0)}`,
            lyVal: `₹${formatIndianNumber(stats.abvChange?.prev || 0, 0)}`,
            changeObj: stats.abvChange,
            unit: "currency",
            trend: stats.abvTrend,
            trendColor: stats.abvTrendColor,
            index: 6
          })}

          {renderKpiCard({
            title: "Conversion %",
            mainVal: stats.conversionChange?.display || "+0%",
            tyVal: `${stats.conversionRate ?? 0}%`,
            lyVal: `${stats.lyConversionRate ?? 0}%`,
            changeObj: stats.conversionChange,
            unit: "pts",
            trend: stats.conversionChange?.trend,
            trendColor: stats.conversionChange?.trendColor,
            index: 7
          })}

          {includeShoe && (
            <>
              {renderKpiCard({
                title: "Shoe Sales",
                mainVal: `${stats.shoeRate ?? 0}%`,
                tyVal: `${stats.shoeRate ?? 0}% (${formatIndianNumber(stats.shoeSale)} Items)`,
                lyVal: `${stats.lyShoeRate ?? 0}% (${formatIndianNumber(stats.lyCardShoeQty || 0)} Items)`,
                changeObj: stats.shoeRateChange,
                unit: "pts",
                trend: stats.shoeRateChange?.trend,
                trendColor: stats.shoeRateChange?.trendColor,
                index: 8
              })}

              {renderKpiCard({
                title: "Shirt Sale",
                mainVal: `${stats.shirtRate ?? 0}%`,
                tyVal: `${stats.shirtRate ?? 0}% (${formatIndianNumber(stats.shirtSales)} Shirts)`,
                lyVal: `${stats.lyShirtRate ?? 0}% (${formatIndianNumber(stats.lyCardShirtQty || 0)} Shirts)`,
                changeObj: stats.shirtRateChange,
                unit: "pts",
                trend: stats.shirtRateChange?.trend,
                trendColor: stats.shirtRateChange?.trendColor,
                index: 9
              })}
            </>
          )}

          {includeDappr && (
            renderKpiCard({
              title: "Dappr Squad",
              subBadge: `${formatIndianNumber(stats.dapprSquadBills)} Bills`,
              mainVal: `₹${formatIndianNumber(stats.dapprSquadValue, 0)}`,
              tyVal: `₹${formatIndianNumber(stats.dapprSquadValue, 0)} (${formatIndianNumber(stats.dapprSquadBills)} Bills)`,
              lyVal: `₹${formatIndianNumber(stats.lyDapprSquadValue || 0, 0)} (${formatIndianNumber(stats.lyDapprSquadBills || 0)} Bills)`,
              changeObj: stats.dapprValChange || stats.dapprChange,
              unit: "currency",
              trend: (stats.dapprValChange || stats.dapprChange)?.trend,
              trendColor: (stats.dapprValChange || stats.dapprChange)?.trendColor,
              index: 10
            })
          )}

          {renderKpiCard({
            title: "Google Reviews",
            mainVal: `${stats.googleReviewRate ?? 0}%`,
            label1: "Google Reviews :",
            tyVal: formatIndianNumber(stats.googleReviews),
            label2: "Total Bills :",
            lyVal: formatIndianNumber(stats.billsGenerated),
            changeObj: stats.reviewsChange,
            unit: "Reviews",
            trend: stats.reviewsChange?.trend,
            trendColor: stats.reviewsChange?.trendColor,
            index: 11
          })}
          </>)}

          {/* Card 12: Staff Rating / Store Rating */}
          <div 
            style={{ animationDelay: "540ms" }}
            className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-5 h-[200px] flex flex-col justify-between font-sans transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-200/80 group cursor-pointer animate-slideUpFade"
          >
            <div>
              <span className="text-[13px] font-bold text-gray-700 block">
                {user?.role === "store_admin" ? "Staff Rating" : "Store Rating"}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-between min-h-0 mt-1">
              <div className="flex flex-col justify-center min-w-0">
                <h3 className="text-[28px] xs:text-[30px] sm:text-[32px] font-extrabold text-gray-900 leading-none">
                  {ratingSummary.averageRating} <span className="text-gray-400 font-normal text-[20px]">/ 5</span>
                </h3>
                <span className="text-[12px] text-gray-400 font-semibold font-sans block mt-3">
                  Based on {ratingSummary.totalRatings} ratings
                </span>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.237.588 1.81l-3.97 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.888a1 1 0 00-1.17 0l-3.971 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.97-2.888c-.772-.573-.37-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>

        </div> {/* Close grid container */}
      </div> {/* Close Key Performance Indicators outer box container */}

      {/* Dual-Column Store Ranking & Operational Highlights section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 font-sans">
        
        {/* Store Performance Ranking (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-full">
          <div className="flex flex-col h-full flex-1 min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
                  {isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "Staff Performance Ranking" : "Store Performance Ranking"}
                </h2>
                <p className="text-gray-400 text-[12px] mt-0.5 font-medium">
                  Best to least - {timeframe} - Showing all {totalRankingItems} {isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "staff" : "stores"}
                </p>
              </div>
              
              {/* Sorting Dropdown */}
              <div className="relative shrink-0">
                <select 
                  value={rankingSort} 
                  onChange={(e) => {
                    setRankingSort(e.target.value);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-[14px] px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 shadow-sm focus:outline-none cursor-pointer hover:border-gray-300"
                >
                  <option value="Best to Least">Sort : Best to Least</option>
                  <option value="Least to Best">Sort : Least to Best</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-5 max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input 
                type="text" 
                value={rankingSearch}
                onChange={(e) => {
                  setRankingSearch(e.target.value);
                }}
                placeholder={isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "Search by staff name..." : "Search by store name..."} 
                className="w-full bg-[#f3f4f6] text-gray-700 text-xs font-semibold rounded-[14px] pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto flex-1 min-h-[460px] max-h-[500px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f3f4f6] rounded-xl text-gray-500 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="py-3 px-4 rounded-l-xl">{isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "Staff Name" : "Store Name"}</th>
                    <th className="py-3 px-4 text-center">{isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "Value" : "Target Achieved %"}</th>
                    <th className="py-3 px-4 text-center">ABS</th>
                    <th className="py-3 px-4 text-center">ABV</th>
                    <th className="py-3 px-4 text-center">Contribution %</th>
                    <th className="py-3 px-4 text-center rounded-r-xl">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                  {processedRanking.map((s, idx) => {
                    const nameParts = s.name.split(" ");
                    const brand = nameParts[0];
                    const loc = nameParts.slice(1).join(" ");
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          {isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? (
                            <span className="block font-extrabold text-gray-900 text-[13px]">{s.name}</span>
                          ) : (
                            <>
                              <span className="block font-extrabold text-gray-900 text-[13px]">{brand}</span>
                              <span className="block text-gray-400 font-medium text-[11px] mt-0.5">{loc || "Store"}</span>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900 font-extrabold text-[13px]">
                          {isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? `₹${formatIndianNumber(s.targetAchieved)}` : `${s.targetAchieved}%`}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500">{s.abs}</td>
                        <td className="py-3 px-4 text-center text-gray-900 font-extrabold">₹{formatIndianNumber(s.abv)}</td>
                        <td className="py-3 px-4 text-center text-gray-500">{s.contribution}%</td>
                        <td className="py-3 px-4 text-center text-gray-900 font-extrabold">{s.conversion}%</td>
                      </tr>
                    );
                  })}
                  {processedRanking.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 font-semibold">
                        {isStoreAdmin || (selectedStores.length === 1 && !selectedStores.includes("All")) ? "No staff found matching search criteria." : "No stores found matching search criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>

        {/* Operational Highlights (col-span-1) */}
        <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-bold text-gray-900 leading-tight">Operational Highlights</h2>
                <p className="text-gray-400 text-[12px] mt-0.5 font-medium">Areas requiring attention to improve performance</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    Live · updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · refreshes every 5 min
                  </span>
                </div>
              </div>
              <button 
                onClick={() => alert("All highlights loaded")}
                className="text-gray-900 hover:text-black font-extrabold text-[12px] flex items-center gap-1 whitespace-nowrap"
              >
                View All 
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Highlights cards stack */}
            <div className="space-y-4">
              {operationalHighlights.map((hl, index) => {
                const isBlue = hl.severity === "blue";
                const isAmber = hl.severity === "amber";
                const isRed = hl.severity === "red";
                
                return (
                  <div key={index} className="border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isBlue ? "bg-blue-50" : isAmber ? "bg-amber-50" : "bg-red-50"
                      }`}>
                        {hl.type === "low_abv_store" || hl.type === "low_abv_employee" ? (
                          // Shopping bag — low ABV
                          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        ) : hl.type === "low_abs_store" || hl.type === "low_abs_employee" ? (
                          // Package/box — low ABS
                          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                          </svg>
                        ) : hl.type === "underperforming_employee_in_store" ? (
                          // Person with exclamation — underperforming employee
                          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : isBlue ? (
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        ) : isAmber ? (
                          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[13px] font-extrabold text-gray-900">{hl.title}</h4>
                        <p className="text-gray-400 font-medium text-[11px] leading-relaxed mt-1">{hl.description}</p>
                      </div>
                    </div>
                    <div className="border-t border-dashed border-gray-100 my-3" />
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isBlue ? "bg-blue-600" : isAmber ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {hl.type === "underperforming_employee_in_store" ? (
                          <span className="flex flex-col leading-tight">
                            <span>{hl.location.split(" → ")[0]}</span>
                            <span className="text-gray-400 font-medium text-[10px]">↳ {hl.location.split(" → ")[1]}</span>
                          </span>
                        ) : (
                          <span>{hl.location}</span>
                        )}
                      </div>
                      <span className="text-gray-900 font-extrabold shrink-0 ml-2">{hl.meta}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div> {/* Close Key Performance Indicators outer box container */}

      </div>
    </div>
  );
};

export default StoreInsights;

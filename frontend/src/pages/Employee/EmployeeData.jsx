import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl, { formatStoreDisplayName } from "../../api/api";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const getProgressColor = (pct) => {
  if (pct === 100) return "#22c55e"; // green
  if (pct >= 85) return "#3b82f6"; // blue
  if (pct >= 50) return "#f59e0b"; // orange
  return "#ef4444"; // red
};

const getRoleRank = (roleOrDesignation) => {
  const r = String(roleOrDesignation || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (r.includes("superadmin")) return 6;
  if (r === "admin") return 5;
  if (r.includes("hradmin")) return 4;
  if (r.includes("clusteradmin")) return 3;
  if (r.includes("storeadmin")) return 2;
  if (r.includes("employee") || r.includes("sales") || r.includes("staff")) return 1;
  return 1; // Default
};

const exportCSV = (data, storeFilter) => {
  const headers = ["#","Emp ID","Name","Role","Store","Training Progress","Tasks Done","Tasks Overdue","Training Done","Training Overdue"];
  const rows = data.map((e, i) => [i+1, e.empID, e.username, e.designation, e.workingBranch, `${e.trainingCompletionPercentage}%`, e.passCountTask, e.taskDue, e.passCountTraining, e.Trainingdue]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(",")).join("\n");
  
  const d = new Date();
  const dateStr = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  const storeLabel = storeFilter && storeFilter !== 'All' ? storeFilter : 'ALL STORES';
  const sanitizedStoreName = String(storeLabel).toUpperCase().replace(/[/\\?%*:|"<>]/g, '').trim();
  const fileName = `${sanitizedStoreName} - EMPLOYEE DATA REPORT - ${dateStr}.csv`;

  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = fileName;
  a.click();
};

const ProgressBar = ({ pct }) => {
  const color = getProgressColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ flex: 1, height: "8px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: "99px", transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", minWidth: "34px", textAlign: "right" }}>{pct}%</span>
    </div>
  );
};

const formatStat = (num) => String(num || 0).padStart(2, "0");

const StatCell = ({ done, total, overdue, pending }) => {
  let statusText = "";
  let statusColor = "";

  if (overdue > 0) {
    statusText = `Overdue : ${overdue}`;
    statusColor = "#ef4444"; // red
  } else if (pending > 0) {
    statusText = `Pending : ${pending}`;
    statusColor = "#3b82f6"; // blue
  } else {
    statusText = "Completed";
    statusColor = "#22c55e"; // green
  }

  return (
    <div style={{ fontSize: "12px", lineHeight: "1.4", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ color: "#374151", fontWeight: 600 }}>{formatStat(done)}/{formatStat(total)}</div>
      <div style={{ color: statusColor, fontWeight: 500, marginTop: "2px" }}>{statusText}</div>
    </div>
  );
};

const mapEmployee = (e) => ({
  empID: e.empID || "",
  username: e.username || "",
  designation: e.designation || "",
  workingBranch: e.workingBranch ? (e.workingBranch.split(',').length > 5 ? "All Stores" : e.workingBranch) : "",
  trainingCount: e.trainingCount || 0,
  passCountTraining: e.passCountTraining || 0,
  Trainingdue: e.trainingDue || 0,
  trainingPending: e.trainingPending !== undefined ? e.trainingPending : Math.max(0, (e.trainingCount || 0) - (e.passCountTraining || 0) - (e.trainingDue || 0)),
  trainingCompletionPercentage: e.trainingCompletionPercentage || 0,
  assignedAssessmentsCount: e.assignedAssessmentsCount || 0,
  passCountAssessment: e.passCountAssessment || 0,
  AssessmentDue: e.assessmentDue || 0,
  assessmentCompletionPercentage: e.assessmentCompletionPercentage || 0,
  taskCount: e.taskCount || 0,
  passCountTask: e.passCountTask || 0,
  taskDue: e.taskDue || 0,
  taskPending: e.taskPending !== undefined ? e.taskPending : Math.max(0, (e.taskCount || 0) - (e.passCountTask || 0) - (e.taskDue || 0)),
});

const EmployeeData = () => {
  const user = useSelector((state) => state.auth.user);
  const isRestrictedRole = user?.role === 'cluster_admin' || user?.role === 'store_admin';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stores, setStores] = useState(["All"]);
  const [roles, setRoles] = useState(["All"]);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const token = localStorage.getItem("token");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage === 'All' ? 500 : itemsPerPage),
        search: search.trim(),
        store: storeFilter,
        role: roleFilter,
      });
      
      let res = await fetch(
        `${baseUrl.baseUrl}api/greythr/employees?${params}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch GreytHR employees");
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map(mapEmployee);
        const sorted = [...mapped].sort((a, b) => {
          const numA = parseInt((a.empID || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt((b.empID || '').replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) return numA - numB;
          return (a.empID || '').localeCompare(b.empID || '');
        });
        
        // Filter out employees on top of them (higher or equal role) if restricted
        const filtered = isRestrictedRole ? sorted.filter(e => {
          const userRank = getRoleRank(user?.role);
          const empRank = getRoleRank(e.designation);
          return empRank < userRank;
        }) : sorted;

        setData(filtered);
        setTotalEmployees(json.totalEmployees ?? json.data.length);
        setTotalPages(json.totalPages ?? 1);
        if (json.filters?.stores?.length) setStores(json.filters.stores);
        
        // Also filter the available role options in the dropdown if restricted
        if (json.filters?.roles?.length) {
          if (isRestrictedRole) {
            const userRank = getRoleRank(user?.role);
            setRoles(json.filters.roles.filter(r => r === 'All' || getRoleRank(r) < userRank));
          } else {
            setRoles(json.filters.roles);
          }
        }
        setError("");
      } else {
        throw new Error(json.message || "Failed");
      }
    } catch {
      setError("Failed to load employees.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, search, storeFilter, roleFilter, itemsPerPage, isRestrictedRole, user?.role]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchEmployees, search]);

  const fetchAllForExport = async () => {
    const params = new URLSearchParams({
      page: "1",
      limit: "500",
      search: search.trim(),
      store: storeFilter,
      role: roleFilter,
    });
    let res = await fetch(
      `${baseUrl.baseUrl}api/greythr/employees?${params}`,
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      res = await fetch(
        `${baseUrl.baseUrl}api/employee/app-users?${params}`,
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
    }
    const json = await res.json();
    if (json.success) {
      const mapped = (json.data || []).map(mapEmployee);
      const filtered = isRestrictedRole ? mapped.filter(e => {
        const userRank = getRoleRank(user?.role);
        const empRank = getRoleRank(e.designation);
        return empRank < userRank;
      }) : mapped;
      exportCSV(filtered, storeFilter);
    }
  };

  const sel = { border:"1px solid #e5e7eb", borderRadius:"8px", padding:"7px 12px", fontSize:"13px", color:"#374151", outline:"none", background:"#fff", cursor:"pointer", fontFamily:"DM Sans, sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:"#f9fafb", fontFamily:"DM Sans, sans-serif" }}>
      <SideNav />

      <div className="ml-0 md:ml-[120px]" style={{ paddingTop:"24px", paddingLeft:"24px", paddingRight:"24px", paddingBottom:"40px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
          <div>
            <h1 style={{ fontSize:"22px", fontWeight:700, lineHeight:1.2, color:"#111827", margin:0 }}>Employee Management</h1>
            <p style={{ fontSize:"12px", color:"#9ca3af", margin:"4px 0 0" }}>Store walkings, tasks, and training progress across all locations</p>
          </div>
          {!isRestrictedRole && (
            <Link to="/employee/create">
              <button style={{ background:"#111827", color:"#fff", border:"none", borderRadius:"10px", padding:"9px 18px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
                + New Employee
              </button>
            </Link>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"7px 12px", background:"#fff", flex:"0 0 260px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search by name, id, branch..." value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} style={{ border:"none", outline:"none", fontSize:"13px", color:"#374151", background:"transparent", width:"100%" }} />
          </div>

          <select value={storeFilter} onChange={e=>{setStoreFilter(e.target.value);setCurrentPage(1);}} style={sel}>
            {stores.map(s=><option key={s} value={s}>{s === "All" ? "Store : All" : formatStoreDisplayName(s)}</option>)}
          </select>

          <select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setCurrentPage(1);}} style={sel}>
            {roles.map(r=><option key={r} value={r}>{r === "All" ? "Role : All" : r}</option>)}
          </select>

          <div style={{ flex:1 }} />

          <button type="button" onClick={fetchAllForExport} style={{ display:"flex", alignItems:"center", gap:"6px", border:"1px solid #e5e7eb", borderRadius:"8px", padding:"7px 14px", fontSize:"13px", fontWeight:500, color:"#374151", background:"#f9fafb", cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>

        <div style={{ background:"#fff", borderRadius:"14px", border:"1px solid #f0f0f0", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"48px" }}>
              <div style={{ width:"28px", height:"28px", border:"2px solid #e5e7eb", borderTopColor:"#111827", borderRadius:"50%", animation:"emp-spin 0.7s linear infinite" }} />
            </div>
          ) : error ? (
            <div style={{ textAlign:"center", padding:"48px", color:"#ef4444", fontSize:"13px" }}>
              {error}
              <button type="button" onClick={fetchEmployees} style={{ marginLeft:12, textDecoration:"underline", background:"none", border:"none", cursor:"pointer", color:"#111827" }}>Retry</button>
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px", color:"#9ca3af", fontSize:"13px" }}>No employees found.</div>
          ) : (
            <>
              <div style={{ overflowX:"auto" }}>
                <table className="min-w-[800px] md:min-w-full" style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                  <thead>
                    <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f3f4f6" }}>
                      {["EMP ID","EMPLOYEE","STORE","TRAINING PROGRESS","TASKS","TRAINING","ACTIONS"].map(h=>(
                        <th key={h} style={{ padding:"10px 16px", textAlign: h==="ACTIONS" ? "center":"left", fontSize:"10px", fontWeight:600, color:"#9ca3af", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((e, i) => (
                      <tr key={e.empID||i} style={{ borderBottom:"1px solid #f9fafb" }}
                        onMouseEnter={ev=>ev.currentTarget.style.background="#fafafa"}
                        onMouseLeave={ev=>ev.currentTarget.style.background="#fff"}
                      >
                        <td style={{ padding:"14px 16px", color:"#374151", fontWeight:500, fontSize:"12px", textTransform:"uppercase" }}>{e.empID || "—"}</td>
                        <td style={{ padding:"14px 16px", minWidth:"160px" }}>
                          <div style={{ fontWeight:600, color:"#111827", fontSize:"13px", textTransform:"uppercase" }}>{e.username || "—"}</div>
                          <div style={{ fontSize:"11px", color:"#9ca3af", marginTop:"2px", textTransform:"uppercase" }}>{e.designation || "—"}</div>
                        </td>
                        <td style={{ padding:"14px 16px", minWidth:"140px" }}>
                          {e.workingBranch ? (
                            <div style={{ fontWeight:500, color:"#374151", fontSize:"13px" }}>
                              {formatStoreDisplayName(e.workingBranch)}
                            </div>
                          ) : <span style={{ color:"#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding:"14px 16px", minWidth:"160px" }}>
                          <ProgressBar pct={e.trainingCompletionPercentage} />
                        </td>
                        <td style={{ padding:"14px 16px", minWidth:"100px" }}>
                          <StatCell done={e.passCountTask} total={e.taskCount} overdue={e.taskDue} pending={e.taskPending} />
                        </td>
                        <td style={{ padding:"14px 16px", minWidth:"100px" }}>
                          <StatCell done={e.passCountTraining} total={e.trainingCount} overdue={e.Trainingdue} pending={e.trainingPending} />
                        </td>
                        <td style={{ padding:"14px 16px", textAlign:"center" }}>
                          <Link to={`/detailed/${e.empID}`} style={{ display:"inline-flex", alignItems:"center", gap:"5px", fontSize:"12px", fontWeight:600, color:"#374151", textDecoration:"none" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderTop: "1px solid #f3f4f6",
                fontSize: "13px",
                color: "#6b7280"
              }}>
                <span>Showing {itemsPerPage === 'All' ? totalEmployees : Math.min(Number(itemsPerPage), Math.max(0, totalEmployees - (currentPage - 1) * Number(itemsPerPage)))} of {totalEmployees}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                    <span style={{ marginRight: "8px", color: "#6b7280" }}>Show:</span>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "5px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#fff",
                        fontSize: "13px",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: "500",
                        outline: "none",
                        minWidth: "64px",
                        justifyContent: "space-between",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                    >
                      <span>{itemsPerPage}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <>
                        <div
                          onClick={() => setIsDropdownOpen(false)}
                          style={{ position: "fixed", inset: 0, zIndex: 998 }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            right: 0,
                            marginBottom: "6px",
                            background: "#4b5563",
                            borderRadius: "10px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                            padding: "4px",
                            zIndex: 999,
                            minWidth: "80px",
                            border: "1px solid rgba(255,255,255,0.08)"
                          }}
                        >
                          {[50, 100, 200, "All"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setItemsPerPage(opt);
                                setCurrentPage(1);
                                setIsDropdownOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                padding: "6px 12px 6px 8px",
                                border: "none",
                                background: "transparent",
                                color: "#fff",
                                fontSize: "13px",
                                textAlign: "left",
                                cursor: "pointer",
                                borderRadius: "6px",
                                fontWeight: itemsPerPage === opt ? "600" : "400",
                                fontFamily: "inherit"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <span style={{ width: "16px", display: "inline-flex", alignItems: "center", marginRight: "4px", fontSize: "11px" }}>
                                {itemsPerPage === opt ? "✓" : ""}
                              </span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        width: "36px",
                        height: "36px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#fff",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        opacity: currentPage === 1 ? 0.4 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        color: "#374151"
                      }}
                      onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      style={{
                        width: "36px",
                        height: "36px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#fff",
                        cursor: (currentPage === totalPages || totalPages === 0) ? "not-allowed" : "pointer",
                        opacity: (currentPage === totalPages || totalPages === 0) ? 0.4 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        color: "#374151"
                      }}
                      onMouseEnter={e => { if (currentPage !== totalPages && totalPages !== 0) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes emp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default EmployeeData;

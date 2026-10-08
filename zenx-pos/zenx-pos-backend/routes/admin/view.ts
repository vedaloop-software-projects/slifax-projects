function escape(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

export function adminPage(title: string, body: string, adminPath: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · ZenxPOS</title><style>body{margin:0;font:15px system-ui;background:#f4f7fc;color:#17233d}header{background:#101c31;color:white;padding:18px 28px;font-size:24px;font-weight:700}header b{color:#3986ff}main{max-width:1100px;margin:32px auto;background:white;padding:28px;border-radius:14px;box-shadow:0 4px 24px #18345b14}nav a{margin-right:16px}label{display:block;margin:12px 0 4px}input,select,button{padding:10px;border:1px solid #ccd5e4;border-radius:7px}button{background:#2869e8;color:white;border:0;cursor:pointer}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #e5e9f2;text-align:left}.error{color:#b42318}</style></head><body><header>Zenx<b>POS</b></header><main><nav><a href="${adminPath}/dashboard">Dashboard</a><a href="${adminPath}/logout">Logout</a></nav><h1>${escape(title)}</h1>${body}</main></body></html>`
}

export function loginPage(adminPath: string, error = '') {
  return adminPage('Administrator login', `${error ? `<p class="error">${escape(error)}</p>` : ''}<form method="post" action="${adminPath}/login"><label>Mobile</label><input name="mobile" inputmode="numeric" required autocomplete="username"><label>Password</label><input name="password" type="password" required autocomplete="current-password"><p><button>Sign in</button></p></form>`, adminPath)
}

export function resourcePage(title: string, rows: Array<Record<string, unknown>>, adminPath: string) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !['password'].includes(key)).slice(0, 8)
  const table = rows.length ? `<table><thead><tr>${keys.map((key) => `<th>${escape(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((key) => `<td>${escape(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>No records found.</p>'
  return adminPage(title, table, adminPath)
}

export function formPage(title: string, fields: string[], action: string, adminPath: string, row: Record<string, unknown> = {}) {
  return adminPage(title, `<form method="post" action="${action}" enctype="multipart/form-data">${fields.map((field) => `<label>${escape(field)}</label><input name="${escape(field)}" type="${field === 'file' ? 'file' : field === 'password' ? 'password' : 'text'}" value="${field === 'file' || field === 'password' ? '' : escape(row[field])}" ${(field === 'file' || field === 'password') && row.id ? '' : 'required'}>`).join('')}<p><button>Save</button></p></form>`, adminPath)
}

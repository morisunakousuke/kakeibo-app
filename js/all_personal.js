import { supabase } from './common.js';

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("allPersonalBody");
  const fromMonth = document.getElementById("fromMonth");
  const toMonth = document.getElementById("toMonth");
  const payerSelect = document.getElementById("payerSelect");
  const settledSelect = document.getElementById("settledSelect");
  const filterBtn = document.getElementById("filterBtn");
  const summaryContainer = document.getElementById("payer-summary-container");

  await loadPayers();
  tbody.innerHTML = "<tr><td colspan='4'>条件を指定して「表示」を押してください</td></tr>";

  filterBtn.addEventListener("click", async () => {
    await loadFilteredData();
  });

  // 🔹 支払者リスト取得
  async function loadPayers() {
    const { data, error } = await supabase.from("payer").select("payerid, payername").order("payerid");
    if (error) {
      console.error("支払者取得エラー:", error);
      return;
    }
    payerSelect.innerHTML = `<option value="">すべて</option>`;
    data.forEach(p => {
      payerSelect.innerHTML += `<option value="${p.payerid}">${p.payername}</option>`;
    });
  }

  // 🔹 支払者別合計を計算して描画
  function renderPayerSummary(rows) {
    if (!summaryContainer) return;
    if (!rows || rows.length === 0) {
      summaryContainer.innerHTML = "";
      return;
    }

    const byPayer = new Map();
    let grand = 0;

    rows.forEach(r => {
      const payer = r.payername || `ID:${r.payerid}`;
      const val = Number(r.total || 0);
      if (!byPayer.has(payer)) byPayer.set(payer, 0);
      byPayer.set(payer, byPayer.get(payer) + val);
      grand += val;
    });

    const list = Array.from(byPayer.entries())
      .sort((a,b) => b[1] - a[1])
      .map(([payer, sum]) => `
        <tr>
          <td>${payer}</td>
          <td>${sum.toLocaleString()}</td>
        </tr>
      `).join("");

    summaryContainer.innerHTML = `
      <table id="payer-summary">
        <thead>
          <tr><th>支払者</th><th>合計金額</th></tr>
        </thead>
        <tbody>
          ${list}
          <tr>
            <th>総合計</th>
            <th>${grand.toLocaleString()}</th>
          </tr>
        </tbody>
      </table>
    `;
  }

  // 🔹 データ取得処理
  async function loadFilteredData() {
    tbody.innerHTML = "<tr><td colspan='4'>読み込み中...</td></tr>";

    try {
      const fromVal = fromMonth.value ? fromMonth.value.slice(0, 7) : "";
      const toVal = toMonth.value ? toMonth.value.slice(0, 7) : "";
      const payerid = payerSelect.value;
      const settledVal = settledSelect.value;

      let query = supabase.from("monthly_personal_summary").select("*");
      if (fromVal) query = query.gte("year_month", fromVal);
      if (toVal) query = query.lte("year_month", toVal);
      if (payerid) query = query.eq("payerid", payerid);
      if (settledVal !== "") query = query.eq("settled", settledVal === "true");

      const { data, error } = await query;
      if (error) throw error;

      const filtered = (data || []).filter(r => (r.total ?? 0) !== 0);
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">該当データがありません</td></tr>`;
        renderPayerSummary([]);
        return;
      }

      filtered.sort((a, b) => {
        const ymA = a.year_month || "";
        const ymB = b.year_month || "";
        const payerA = a.payername || "";
        const payerB = b.payername || "";
        return ymA === ymB
          ? payerA.localeCompare(payerB, "ja")
          : ymA.localeCompare(ymB);
      });

      tbody.innerHTML = filtered
        .map(
          r => `
          <tr>
            <td>${r.year_month}</td>
            <td>${r.payername}</td>
            <td>${r.total ? r.total.toLocaleString() : ""}</td>
            <td>
              <input type="checkbox"
                     class="settle-checkbox"
                     data-year="${r.year_month}"
                     data-payer="${r.payerid}"
                     ${r.settled ? "checked" : ""}>
            </td>
          </tr>`
        )
        .join("");

      document.querySelectorAll(".settle-checkbox").forEach(cb => {
        cb.addEventListener("change", async e => {
          const yearMonth = e.target.dataset.year;
          const payerid = e.target.dataset.payer;
          const newVal = e.target.checked;

          try {
            const { error } = await supabase
              .from("monthly_settled")
              .update({ settled: newVal })
              .eq("payerid", payerid)
              .eq("year_month", yearMonth);
            if (error) throw error;
          } catch (err) {
            console.error("更新失敗:", err);
            alert("更新に失敗しました。");
            e.target.checked = !newVal;
          }
        });
      });

      // 🔹 支払者別合計描画
      renderPayerSummary(filtered);

    } catch (err) {
      console.error("読み込みエラー:", err);
      tbody.innerHTML = `<tr><td colspan="4" style="color:red;">データ取得に失敗しました</td></tr>`;
      renderPayerSummary([]);
    }
  }
});

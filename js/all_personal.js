import { supabase } from './common.js';

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("allPersonalBody");
  const fromMonth = document.getElementById("fromMonth");
  const toMonth = document.getElementById("toMonth");
  const payerSelect = document.getElementById("payerSelect");
  const settledSelect = document.getElementById("settledSelect");
  const filterBtn = document.getElementById("filterBtn");

  await loadPayers();

  tbody.innerHTML = "<tr><td colspan='4'>条件を指定して「表示」を押してください</td></tr>";

  filterBtn.addEventListener("click", async () => {
    await loadFilteredData();
  });

  // 支払者リスト取得
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

  // データ取得処理
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

      // 金額0除外
      const filtered = (data || []).filter(r => (r.total ?? 0) !== 0);

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">該当データがありません</td></tr>`;
        return;
      }

      // 並び替え
      filtered.sort((a, b) => {
        const ymA = a.year_month || "";
        const ymB = b.year_month || "";
        const payerA = a.payername || "";
        const payerB = b.payername || "";
        return ymA === ymB
          ? payerA.localeCompare(payerB, "ja")
          : ymA.localeCompare(ymB);
      });

      // 表描画
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

      // チェック更新
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
    } catch (err) {
      console.error("読み込みエラー:", err);
      tbody.innerHTML = `<tr><td colspan="4" style="color:red;">データ取得に失敗しました</td></tr>`;
    }
  }
});

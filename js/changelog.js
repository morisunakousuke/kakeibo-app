document.addEventListener("DOMContentLoaded", () => {
  const changelogData = [
    { version: "v1.0.0", date: "2025-11-10", content: "家計簿アプリ初版リリース" },
    // 今後改版した場合はこの1つ上の行をコピーして追記
    
    
    
    
  ];

  const tbody = document.getElementById("changelogBody");
  changelogData.forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${log.version}</td>
      <td>${log.date}</td>
      <td>${log.content}</td>
    `;
    tbody.appendChild(tr);
  });

  // 戻るボタンの処理
  document.getElementById("backBtn").addEventListener("click", () => {
    location.href = "./AdministratorMenu.html";
  });
});

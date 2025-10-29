window.onload = function(){
    var getToday = new Date();
    var y = getToday.getFullYear();
    var m = getToday.getMonth() + 1;
    var d = getToday.getDate();
    var today = y + "-" + m.toString().padStart(2,'0') + "-" + d.toString().padStart(2,'0');
    var todaymonth = y + "-" + m.toString().padStart(2,'0')
    document.getElementById("datepicker").setAttribute("value",today);
    document.getElementById("datemonth").setAttribute("value",todaymonth);
}
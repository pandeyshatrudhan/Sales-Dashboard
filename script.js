//agent supabase
const SUPABASE_URL = "https://quucddzdcnimyyxslhcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dWNkZHpkY25pbXl5eHNsaGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzEyNjEsImV4cCI6MjA5NjkwNzI2MX0.ZYBqKro0Yda43VWNofCSkmhGNeyeigB_Mf-UmkkaC2g";

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


function theme() {
  const isDark = document.body.classList.toggle('dark');
  const themeButton = document.getElementById('theme_button');
  themeButton.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('dashboardTheme', isDark ? 'dark' : 'light');
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('dashboardTheme');
  const useDark = savedTheme === 'dark';
  if (useDark) {
    document.body.classList.add('dark');
  }
  document.getElementById('theme_button').textContent = useDark ? '☀️' : '🌙';
}

let latestDashboardData = null;


function downloadCsv() {
  if (!latestDashboardData || !latestDashboardData.employee_data) {
    alert('Please load dashboard data before downloading CSV.');
    return;
  }

  const rows = latestDashboardData.employee_data.map((row, index) => ({
    Rank: index + 1,
    Name: row.name,
    'Today Sales': row.today_sales,
    'Today Revenue': row.today_revenue,
    'Monthly Sales': row.month_sales,
    'Monthly Revenue': row.month_revenue,
  }));

  const header = Object.keys(rows[0]);
  const csv = [header.join(',')].concat(
    rows.map(r => header.map(field => `"${String(r[field] ?? '').replace(/"/g, '""')}"`).join(','))
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sales-dashboard-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function initializeDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  document.getElementById('currentdate').value = `${year}-${month}-${day}`;
  loadDashboard();

}

initializeTheme();
initializeDate();



async function loadDashboard() {

    const date = document.getElementById("currentdate").value;

    const { data: kpi_data, error: kpi_error } = await sb.rpc("kpi_metric_card", {
        report_date: date
    });

    if (kpi_error) {
        console.error(kpi_error);
        return;
        }

    // employee performance
    const { data: employee_data, error: employee_error } = await sb.rpc("employe_data",{
        report_date: date
    });

    if(employee_error){
        console.error(employee_error);
        return;
    }
    // daily summary graph
    const{ data: daily_summary_data,error:daily_summary_error}= await sb.rpc("daily_sales",{
        report_date: date
    });
    if(daily_summary_error){
        console.error(daily_summary_error);
        return;
    }
    // monthly sales graph
    const {data:monthly_summary_data,error:monthly_summary_error}=await sb.rpc("monthly_sales",{
        report_date:date
    });
    if(monthly_summary_error){
        console.error(monthly_summary_error);
        return;
    }
    const data={kpi_data,employee_data, daily_summary_data,monthly_summary_data};
    

   
    latestDashboardData = data;

    const kpi_card_data = kpi_data[0];   // Get the first object

    document.getElementById("today_orders").textContent = kpi_card_data.today_sales;
    document.getElementById("today_revenue").textContent = kpi_card_data.todey_revenue;
    document.getElementById("monthly_orders").textContent = kpi_card_data.mtd_sales;
    document.getElementById("monthly_revenue").textContent = kpi_card_data.mtd_revenue;
    document.getElementById("previous_month_same_day_orders").textContent = kpi_card_data.previous_same_day_sales;
    document.getElementById("previous_month_same_day_revenue").textContent = kpi_card_data.previous_same_day_revenue;
    document.getElementById("previous_month_orders").textContent = kpi_card_data.previous_MTD_SALES;
    document.getElementById("previous_month_revenue").textContent = kpi_card_data.previous_MTD_REVENUE;


    
    // employee performance
    // we already define employee_data on fetch time line=85

    var table_data = "";
    
    for (var i = 0; i < employee_data.length; i++) {
        const daily_leaderboard_data = employee_data[i];
        const rowClass = i === 0 ? "rank_top1" : i === 1 ? "rank_top2" : i === 2 ? "rank_top3" : "";
        const rankBadge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        table_data += `
        <tr${rowClass ? ` class="${rowClass}"` : ""}>
            <td><span class="rank_cell">${rankBadge}</span></td>
            <td>${daily_leaderboard_data.name}</td>
            <td>${daily_leaderboard_data.today_sales}</td>
            <td>${daily_leaderboard_data.today_revenue}</td>
            <td>${daily_leaderboard_data.month_sales}</td>
            <td>${daily_leaderboard_data.month_revenue}</td>
        </tr>
        
        `;

    }
    document.getElementById("emp_data").innerHTML=table_data;
    // daily summary data
    // we already define daily_summary_data on fetch time line=94
    daily_summary_graph(daily_summary_data);// call function

    // monthly summary data
    // we already define monthly_summary_data on fetch time line=102
    monthly_summary_graph(monthly_summary_data);
}

let dailysummaryChart; // Global variable

function daily_summary_graph(daily_summary_data) {

    const date = [];
    const sales = [];

    for (let i = 0; i < daily_summary_data.length; i++) {
        date.push(daily_summary_data[i].date);
        sales.push(daily_summary_data[i].sales);
    }

    const ctx = document.getElementById("daily_summary_graph");

    // Destroy the previous chart if it exists
    if (dailysummaryChart) {
        dailysummaryChart.destroy();
    }

    // Create a new chart
    dailysummaryChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: date,
            datasets: [{
                label: "Sales",
                data: sales,
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 1.5,
                fill: true,
                backgroundColor: "rgba(221, 102, 5, 0.5)",
                borderColor: "rgb(221, 102, 5)",
                pointHoverRadius: 5

            }]
        }
    })
};
// monthly summary graph

let monthlysummarychart;

function monthly_summary_graph(monthly_summary_data){
    const month=[]
    const sales=[]

    for(var i=0;i<monthly_summary_data.length;i++){
        month.push(monthly_summary_data[i].month)
        sales.push(monthly_summary_data[i].sales)
    }
    const ctx = document.getElementById("monthly_summary_graph");

    if(monthlysummarychart){
        monthlysummarychart.destroy();
    }
    
        monthlysummarychart =new Chart(ctx,{
            type:"line",
            data:{
                labels:month,
                datasets:[{
                    label: "Sales",
                    data: sales,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 1.5,
                    fill: true,
                    backgroundColor: "rgba(221, 102, 5, 0.5)",
                    borderColor: "rgb(221, 102, 5)",
                    pointHoverRadius: 5
                }]
            }
        })
    
};

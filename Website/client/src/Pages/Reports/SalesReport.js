import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import Sidebar from "../../Components/Sidebar/Sidebar";
import "./SalesReport.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SalesReport() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const chartRef = React.useRef();

  useEffect(() => {
    fetch("http://localhost:3001/api/orders/sales-report", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch sales report");
        return res.json();
      })
      .then((data) => {
        console.log("Received sales data:", data); // Debug log
        setSalesData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching sales data:", err); // Debug log
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter data by selected month (YYYY-MM)
  const filteredData = React.useMemo(() => {
    console.log("Filtering data:", { selectedMonth, salesData }); // Debug log
    if (!selectedMonth) return salesData;
    // selectedMonth is in format YYYY-MM
    const [year, month] = selectedMonth.split("-");
    return salesData.filter((item) => {
      if (!item.month_date) return false;
      const d = new Date(item.month_date);
      // JS months are 0-based, so add 1 and pad
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const y = String(d.getFullYear());
      return y === year && m === month;
    });
  }, [salesData, selectedMonth]);

  const data = {
    labels: filteredData.map((item) => item.month.trim()),
    datasets: [
      {
        label: "Number of Sales",
        data: filteredData.map((item) => Number(item.number_of_sales)),
        backgroundColor: "rgba(75, 192, 192, 0.7)", // Teal
        yAxisID: "y-sales",
      },
      {
        label: "Total Revenue",
        data: filteredData.map((item) => Number(item.total_revenue)),
        backgroundColor: "rgba(255, 99, 132, 0.7)", // Pink
        yAxisID: "y-revenue",
      },
    ],
  };

  // Calculate the max values for dynamic axis scaling
  const maxSales = Math.max(
    ...filteredData.map((item) => Number(item.number_of_sales) || 0),
    0
  );
  const salesAxisMax = Math.ceil(maxSales / 20) * 20 || 20;
  const maxRevenue = Math.max(
    ...filteredData.map((item) => Number(item.total_revenue) || 0),
    0
  );
  const revenueAxisMax = Math.ceil(maxRevenue / 20000) * 20000 || 20000;

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Sales Report",
      },
    },
    scales: {
      "y-sales": {
        type: "linear",
        position: "left",
        title: {
          display: true,
          text: "Number of Sales",
        },
        max: salesAxisMax,
        ticks: {
          stepSize: 20,
        },
      },
      "y-revenue": {
        type: "linear",
        position: "right",
        title: {
          display: true,
          text: "Total Revenue (₱)",
        },
        max: revenueAxisMax,
      },
    },
  };

  const handleExportPDF = async () => {
    const input = chartRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("sales_report.pdf");
  };

  const renderContent = () => {
    if (loading)
      return <div className="loading-message">Loading sales report...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
      <div className="report-container">
        <h2 className="report-title">Sales Report</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          <button onClick={handleExportPDF} className="export-btn pdf-btn">
            Export as PDF
          </button>
        </div>
        <div className="month-picker-container">
          <label className="month-picker-label" htmlFor="month-picker">
            Select Month:
          </label>
          <input
            id="month-picker"
            className="month-picker-input"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="chart-container" ref={chartRef}>
          <Bar
            data={data}
            options={{
              ...options,
              maintainAspectRatio: false,
              responsive: true,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <div className="content-wrapper">{renderContent()}</div>
      </div>
    </div>
  );
}

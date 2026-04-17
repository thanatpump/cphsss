"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';

interface HospcodeData {
  id: number;
  hospcode_5_digit: string;
  name: string;
  amp_name?: string;
  amppart?: string;
  chwpart?: string;
  hospital_type_id?: string;
}

export default function HospcodeCheckPage() {
  const [data, setData] = useState<HospcodeData[]>([]);
  const [ampList, setAmpList] = useState<string[]>([]);
  const [filteredAmpList, setFilteredAmpList] = useState<string[]>([]);
  const [selectedAmp, setSelectedAmp] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [hospList, setHospList] = useState<HospcodeData[]>([]);
  const [selectedHosp, setSelectedHosp] = useState<string>("");
  const [stmmData, setStmmData] = useState<any[]>([]);
  const [stmsData, setStmsData] = useState<any[]>([]);
  const [sognstmmData, setSognstmmData] = useState<any[]>([]);
  const [sognstmpData, setSognstmpData] = useState<any[]>([]);
  const [stmmSummary, setStmmSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hospitalListLoading, setHospitalListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [hospSummary, setHospSummary] = useState<any>({});
  const [summaryMonths, setSummaryMonths] = useState<string[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [ampSummary, setAmpSummary] = useState<any>({});
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear() - 1);
  const [startMonth, setStartMonth] = useState<number>(10);
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);

  // ข้อมูลประเภทหน่วยบริการ
  const hospitalTypes = [
    { id: "", name: "-- ทุกประเภท --", types: [] },
    { id: "hospital", name: "โรงพยาบาล", types: ["5", "6", "7"] },
    { id: "rps", name: "รพ.สต.", types: ["18", "19"] },
    { id: "rps_moph", name: "รพ.สต. สังกัดกระทรวงสาธารณสุข", types: ["18"] },
    { id: "rps_local", name: "รพ.สต. สังกัดองค์กรปกครองส่วนท้องถิ่น", types: ["19"] }
  ];

  // คำนวณ pagination
  const totalItems = hospList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = hospList.slice(startIndex, endIndex);

  useEffect(() => {
    setHospitalListLoading(true);
    
    // ดึงข้อมูล hospcode
    fetch("/api/hospcode-list")
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(res => {
      // sort ข้อมูลก่อน setData - เรียงแบบตัวเลข
      const hospcodeData = (res.data || []).sort((a: HospcodeData, b: HospcodeData) => {
        const numA = parseInt(a.hospcode_5_digit, 10);
        const numB = parseInt(b.hospcode_5_digit, 10);
        return numA - numB;
      });
      setData(hospcodeData);
      
      // กรองข้อมูลเฉพาะโรงพยาบาลที่มี chwpart="36" เท่านั้น (ไม่กรอง hospital_type_id ณ จุดนี้)
      const filteredHospcodeData = hospcodeData.filter((item: HospcodeData) => {
        return item.chwpart === "36";
      });
      
      // สร้าง list อำเภอจาก hospcode ที่กรองแล้ว
      const amps = Array.from(new Set(filteredHospcodeData.map((item: HospcodeData) => item.amp_name).filter(Boolean))) as string[];
      
      setAmpList(amps);
      setFilteredAmpList(amps);
      
      // แสดงข้อมูลที่กรองแล้วตั้งแต่เริ่มต้น (เฉพาะ chwpart="36")
      setHospList(filteredHospcodeData.sort((a: HospcodeData, b: HospcodeData) => {
        const numA = parseInt(a.hospcode_5_digit, 10);
        const numB = parseInt(b.hospcode_5_digit, 10);
        return numA - numB;
      }));
      
      setHospitalListLoading(false);
    })
    .catch(error => {
      console.error('Error loading data:', error);
      setHospitalListLoading(false);
    });
  }, []);

  useEffect(() => {
    setSummaryLoading(true);
    const url = new URL("/api/data-signstmm?summaryAll=1", window.location.origin);
    if (selectedType) url.searchParams.set("type", selectedType);
    
    // เพิ่มพารามิเตอร์วันที่ถ้าเลือกใช้
    if (useDateFilter) {
      // ตรวจสอบว่าช่วงวันที่ถูกต้อง (เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น)
      const startDateValue = new Date(startYear, startMonth - 1, 1);
      const endDateValue = new Date(endYear, endMonth - 1, 1);
      
      if (endDateValue < startDateValue) {
        // ถ้าช่วงวันที่ไม่ถูกต้อง ให้ใช้ค่าเริ่มต้น
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        let defaultStartYear = currentYear;
        if (currentMonth < 10) defaultStartYear = currentYear - 1;
        const startDate = `${defaultStartYear}-10-01`;
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;
        url.searchParams.set("startDate", startDate);
        url.searchParams.set("endDate", endDate);
      } else {
        const startDate = `${startYear}-${startMonth.toString().padStart(2, '0')}-01`;
        // หาวันสุดท้ายของเดือนสิ้นสุด
        const lastDayOfMonth = new Date(endYear, endMonth, 0).getDate();
        const endDate = `${endYear}-${endMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;
        url.searchParams.set("startDate", startDate);
        url.searchParams.set("endDate", endDate);
      }
    }
    
    fetch(url.toString())
      .then(res => res.json())
      .then(res => {
        setAmpSummary(res.ampSummary || {});
        setHospSummary(res.hospSummary || {});
        // สร้าง array เดือน
        const months: string[] = [];
        if (useDateFilter) {
          // ถ้าเลือกช่วงเดือน ให้แสดงทุกเดือนในช่วงที่เลือก
          let y = startYear;
          let m = startMonth;
          while (y < endYear || (y === endYear && m <= endMonth)) {
            months.push(`${y}-${m.toString().padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
          }
        } else {
          // ถ้าไม่เลือกวันที่ ให้แสดงตั้งแต่ต.ค.ปีที่แล้ว ถึง ปัจจุบัน
        let y = res.startYear;
        let m = 10;
        const endY = res.currentYear;
        const endM = res.currentMonth;
        while (y < endY || (y === endY && m <= endM)) {
          months.push(`${y}-${m.toString().padStart(2, '0')}`);
          m++;
          if (m > 12) { m = 1; y++; }
          }
        }
        setSummaryMonths(months);
        setSummaryLoading(false);
      });
  }, [selectedType, useDateFilter, startYear, startMonth, endYear, endMonth]);

  // อัพเดทรายการโรงพยาบาลเมื่อเลือกอำเภอ
  useEffect(() => {
    setHospitalListLoading(true);
    setCurrentPage(1);
    
    // ใช้ข้อมูลที่กรองแล้วจาก hospcode (เฉพาะ chwpart="36")
    const filteredHospcodeData = data.filter((item: HospcodeData) => {
      return item.chwpart === "36";
    });
    
    let filtered = filteredHospcodeData;
    
    if (selectedAmp) {
      // กรองข้อมูลตามอำเภอที่เลือก (ใช้ amp_name)
      filtered = filtered.filter(item => item.amp_name === selectedAmp);
    }
    
    if (selectedType) {
      const selectedTypeData = hospitalTypes.find(type => type.id === selectedType);
      if (selectedTypeData) {
        // กรองตามประเภทหน่วยบริการ
        filtered = filtered.filter(item => {
          const matchesType = item.hospital_type_id && 
                             item.hospital_type_id !== "" && 
                             selectedTypeData.types.includes(item.hospital_type_id);
          
          return matchesType;
        });
      }
    }
    
    setHospList(filtered.sort((a: HospcodeData, b: HospcodeData) => {
      const numA = parseInt(a.hospcode_5_digit, 10);
      const numB = parseInt(b.hospcode_5_digit, 10);
      return numA - numB;
    }));
    setSelectedHosp("");
    setHospitalListLoading(false);
  }, [selectedAmp, selectedType, data]);

  // ฟังก์ชันเปลี่ยนหน้า
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  useEffect(() => {
    if (selectedHosp) {
      setLoading(true);
      const hospcode = selectedHosp.split('|')[0];
      // ดึง summary STMM รายเดือน
      fetch(`/api/data-signstmm?hproc=${hospcode}&summary=1`)
        .then(res => res.json())
        .then(res => {
          setStmmSummary(res.summary || []);
        });
      // ดึงข้อมูล stmm
      fetch(`/api/data-signstmm?hproc=${hospcode}&limit=10&page=1`)
        .then(res => res.json())
        .then(res => {
          setStmmData(res.data || []);
        });
      
      // ดึงข้อมูล stms
      fetch(`/api/data-signstms?hproc=${hospcode}&limit=10&page=1`)
        .then(res => res.json())
        .then(res => {
          setStmsData(res.data || []);
        });
      
      // ดึงข้อมูล sognstmm
      fetch(`/api/data-sognstmm?hproc=${hospcode}&limit=10&page=1`)
        .then(res => res.json())
        .then(res => {
          setSognstmmData(res.data || []);
        });
      
      // ดึงข้อมูล sognstmp
      fetch(`/api/data-sognstmp?hproc=${hospcode}&limit=10&page=1`)
        .then(res => res.json())
        .then(res => {
          setSognstmpData(res.data || []);
          setLoading(false);
        });
    } else {
      setStmmSummary([]);
      setStmmData([]);
      setStmsData([]);
      setSognstmmData([]);
      setSognstmpData([]);
    }
  }, [selectedHosp]);

  function renderTable(data: any[], title: string) {
    if (!data || data.length === 0) return null;
    const columns = Object.keys(data[0]);
    return (
      <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-blue-100 text-sm">จำนวนข้อมูล: {data.length} รายการ</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-3 text-sm text-gray-900 border-b">
                      <div className="max-w-xs truncate" title={row[col]?.toString() || "-"}>
                        {row[col]?.toString() || "-"}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">SSO</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ระบบจัดสรรเงินประกันสังคมจังหวัดชัยภูมิ</h1>
                <p className="text-sm text-gray-600">Social Security Office</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
              >
                กลับหน้าแรก
              </Link>
            </div>
          </div>
          <p className="text-lg text-blue-700 text-center">เลือกประเภทหน่วยบริการและอำเภอเพื่อกรองข้อมูล (ไม่บังคับ)</p>
        </div>

        {/* Hospital List */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border-t-8 border-blue-400">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-4 shadow">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-blue-900 mb-1">{selectedAmp ? `หน่วยบริการในอำเภอ: ${selectedAmp}` : "ยอดรวมรายอำเภอทั้งหมด"}</h3>
              <p className="text-md text-blue-600">
                {summaryLoading ? "กำลังโหลด..." : selectedAmp ? `พบ ${Object.values(hospSummary).filter((h: any) => h.amp_name === selectedAmp).length} โรงพยาบาล` : `พบ ${Object.keys(ampSummary).length} อำเภอ`}
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6 mb-6">
            <div className="flex-1 mb-4 md:mb-0 order-2 md:order-1">
              <label className="block text-blue-800 font-semibold mb-2">อำเภอ</label>
              <select
                className="w-full border border-blue-200 rounded-lg px-5 py-3 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-blue-50"
                value={selectedAmp}
                onChange={e => setSelectedAmp(e.target.value)}
              >
                <option value="">-- แสดงยอดรวมรายอำเภอทั้งหมด --</option>
                {Object.keys(ampSummary).map(amp => (
                  <option key={amp} value={amp}>{amp}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 order-1 md:order-2 mb-4 md:mb-0">
              <label className="block text-blue-800 font-semibold mb-2">ประเภทหน่วยบริการ</label>
              <select
                className="w-full border border-blue-200 rounded-lg px-5 py-3 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-blue-50"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                {hospitalTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Date Filter Section */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="useDateFilter"
                checked={useDateFilter}
                onChange={e => setUseDateFilter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useDateFilter" className="ml-2 text-blue-800 font-semibold">
                กรองตามช่วงเดือน-ปี
              </label>
            </div>
            {useDateFilter && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* เริ่มต้น */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="text-blue-800 font-semibold mb-3 text-center">ตั้งแต่</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-800 font-semibold mb-2">เดือน</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-white"
                          value={startMonth}
                          onChange={e => setStartMonth(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const month = i + 1;
                            const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", 
                                             "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
                            return (
                              <option key={month} value={month}>{thMonths[month - 1]}</option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-blue-800 font-semibold mb-2">ปี</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-white"
                          value={startYear}
                          onChange={e => setStartYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return (
                              <option key={year} value={year}>{year}</option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* สิ้นสุด */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="text-blue-800 font-semibold mb-3 text-center">ถึง</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-800 font-semibold mb-2">เดือน</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-white"
                          value={endMonth}
                          onChange={e => setEndMonth(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const month = i + 1;
                            const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", 
                                             "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
                            return (
                              <option key={month} value={month}>{thMonths[month - 1]}</option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-blue-800 font-semibold mb-2">ปี</label>
                        <select
                          className="w-full border border-blue-200 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors shadow-sm bg-white"
                          value={endYear}
                          onChange={e => setEndYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return (
                              <option key={year} value={year}>{year}</option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth() + 1;
                      let defaultStartYear = currentYear;
                      if (currentMonth < 10) defaultStartYear = currentYear - 1;
                      setStartYear(defaultStartYear);
                      setStartMonth(10);
                      setEndYear(currentYear);
                      setEndMonth(currentMonth);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
                  >
                    ตั้งค่าเป็นช่วงเริ่มต้น (ต.ค. ปีที่แล้ว - เดือนปัจจุบัน)
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-100 to-blue-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-b">{selectedAmp ? "รหัส" : "อำเภอ"}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-blue-800 uppercase tracking-wider border-b">{selectedAmp ? "ชื่อโรงพยาบาล" : ""}</th>
                  {summaryMonths.map(month => (
                    <th key={month} className="px-4 py-3 text-center text-xs font-bold text-blue-800 uppercase tracking-wider border-b whitespace-nowrap">
                      {(() => {
                        // รูปแบบ YYYY-MM (แสดงรายเดือน)
                        const [y, m] = month.split('-');
                        const thMonths = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                        return `${thMonths[parseInt(m, 10)]} ${y.slice(-2)}`;
                      })()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-100">
                {summaryLoading ? (
                  <tr><td colSpan={selectedAmp ? 2 + summaryMonths.length : 2 + summaryMonths.length} className="text-center py-8 text-blue-400">กำลังโหลดข้อมูล...</td></tr>
                ) : selectedAmp
                  ? (() => {
                      const selectedTypeData = hospitalTypes.find(type => type.id === selectedType);
                      const allowedAll = ["5", "6", "7", "18", "19"];
                      const filteredHospList = Object.entries(hospSummary)
                        .filter(([, val]: any) => val.amp_name === selectedAmp)
                        .filter(([, val]: any) =>
                          selectedType === ""
                            ? (val.hospital_type_id && allowedAll.includes(val.hospital_type_id))
                            : (!selectedTypeData?.types.length ||
                              (val.hospital_type_id && selectedTypeData.types.includes(val.hospital_type_id)))
                        )
                        .sort(([hospcodeA], [hospcodeB]) => {
                          const numA = parseInt(hospcodeA, 10);
                          const numB = parseInt(hospcodeB, 10);
                          return numA - numB;
                        });
                      if (filteredHospList.length === 0) return <tr><td colSpan={2 + summaryMonths.length} className="text-center py-8 text-blue-400">ไม่พบข้อมูลโรงพยาบาลในอำเภอนี้</td></tr>;
                      return filteredHospList.map(([hospcode, val]: any) => {
                        // แสดงข้อมูลปกติ (หน้านี้ไม่ต้อง login แล้ว)
                        return (
                          <tr key={hospcode} className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3 text-blue-900 border-b font-mono whitespace-nowrap font-semibold">{hospcode}</td>
                            <td className="px-4 py-3 text-blue-900 border-b whitespace-nowrap font-semibold">{val.name}</td>
                            {summaryMonths.map(month => (
                              <td key={month} className="px-4 py-3 text-blue-900 border-b text-center font-bold">
                                {val.summary[month] || 0}
                              </td>
                            ))}
                          </tr>
                        );
                      });
                    })()
                  : Object.entries(ampSummary).map(([amp, val]: any) => (
                      <tr key={amp} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-blue-900 border-b whitespace-nowrap font-semibold">{amp}</td>
                        <td className="px-4 py-3 text-blue-900 border-b"></td>
                        {summaryMonths.map(month => (
                          <td key={month} className="px-4 py-3 text-blue-900 border-b text-center font-bold">
                            {val.summary[month] || 0}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-blue-600 transition ease-in-out duration-150">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังโหลดข้อมูล...
            </div>
          </div>
        )}

        {/* Data Tables */}
        {selectedHosp && !loading && (
          <div className="space-y-6">
            {stmmSummary.length > 0 && (
              <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white">สรุปจำนวนคนไข้ STMM รายเดือน</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">เดือน</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">จำนวนคนไข้</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stmmSummary.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 border-b">{row.month}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-b">{row.patient_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {renderTable(stmmData, "ข้อมูล STMM")}
            {renderTable(stmsData, "ข้อมูล STMS")}
            {renderTable(sognstmmData, "ข้อมูล SOGNSTMM")}
            {renderTable(sognstmpData, "ข้อมูล SOGNSTMP")}
          </div>
        )}

        {/* Empty State */}
        {selectedHosp && !loading && stmmData.length === 0 && stmsData.length === 0 && sognstmmData.length === 0 && sognstmpData.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
            <p className="text-gray-500">ไม่พบข้อมูลสำหรับโรงพยาบาลที่เลือก</p>
          </div>
        )}
      </div>
    </div>
  );
} 
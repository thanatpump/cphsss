'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface GroupedFacilityStats {
  hcode: string;
  facility_name: string;
  total: number;
  with_card: number;
  no_card: number;
}

const SERIES = [
  { key: 'total' as const, name: 'ทั้งหมด', color: '#9333ea' },
  { key: 'with_card' as const, name: 'เอาบัตรมา', color: '#14b8a6' },
  { key: 'no_card' as const, name: 'ไม่มีบัตร', color: '#f97316' },
];

export default function AuthVerificationGroupedChart({
  facilities,
  highlightHcode,
}: {
  facilities: GroupedFacilityStats[];
  highlightHcode?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;

    if (facilities.length === 0) {
      chart.clear();
      return;
    }

    const categories = facilities.map((facility) =>
      facility.facility_name.length > 18 ? facility.hcode : facility.facility_name
    );
    const initialEnd = facilities.length <= 12 ? 100 : Math.round((12 / facilities.length) * 100);

    chart.setOption(
      {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: unknown) => {
            const items = (Array.isArray(params) ? params : [params]) as Array<{
              dataIndex: number;
              marker: string;
              seriesName: string;
              value: number;
            }>;
            const idx = items[0]?.dataIndex ?? 0;
            const facility = facilities[idx];
            let html = `<strong>${facility?.facility_name ?? ''}</strong> (${facility?.hcode ?? ''})<br/>`;
            for (const item of items) {
              html += `${item.marker} ${item.seriesName}: ${Number(item.value).toLocaleString('th-TH')}<br/>`;
            }
            return html;
          },
        },
        legend: {
          data: SERIES.map((series) => series.name),
          bottom: facilities.length > 12 ? 36 : 0,
        },
        grid: {
          left: 20,
          right: 20,
          top: 24,
          bottom: facilities.length > 12 ? 110 : 72,
          containLabel: true,
        },
        dataZoom:
          facilities.length > 12
            ? [
                { type: 'slider', start: 0, end: initialEnd, height: 20, bottom: 8 },
                { type: 'inside', start: 0, end: initialEnd },
              ]
            : [],
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            interval: 0,
            rotate: categories.length > 8 ? 35 : 0,
            fontSize: 11,
          },
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed' } },
        },
        series: SERIES.map((series) => ({
          name: series.name,
          type: 'bar',
          barGap: 0,
          itemStyle: { color: series.color },
          emphasis: { focus: 'series' },
          data: facilities.map((facility) => ({
            value: facility[series.key],
            itemStyle:
              highlightHcode && facility.hcode === highlightHcode
                ? { borderColor: '#4c1d95', borderWidth: 2 }
                : undefined,
          })),
          label: {
            show: true,
            position: 'insideBottom',
            align: 'left',
            verticalAlign: 'middle',
            rotate: 90,
            distance: 4,
            fontSize: 10,
            color: '#ffffff',
            formatter: (params: { value?: number; seriesName?: string }) => {
              if (!params.value) return '';
              return `${params.value} ${params.seriesName ?? ''}`;
            },
          },
        })),
      },
      true
    );
  }, [facilities, highlightHcode]);

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white p-4">
      <h3 className="text-lg font-bold text-gray-900">กราฟรวมทุก รพสต.</h3>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Grouped bar chart · เปรียบเทียบ ทั้งหมด / เอาบัตรมา / ไม่มีบัตร ต่อหน่วยบริการ
      </p>
      {facilities.length === 0 ? (
        <div className="py-10 text-center text-gray-500">ไม่มีข้อมูลสำหรับกราฟรวม</div>
      ) : (
        <div ref={chartRef} className="w-full h-[440px]" />
      )}
    </div>
  );
}

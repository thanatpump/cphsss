'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function SsopEChart({
  option,
  height = 320,
  onPointClick,
}: {
  option: Record<string, unknown>;
  height?: number;
  onPointClick?: (name: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onPointClick);
  clickRef.current = onPointClick;

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    const onClick = (params: { name?: string }) => {
      if (params?.name) clickRef.current?.(params.name);
    };
    chart.on('click', onClick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.off('click', onClick);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option as echarts.EChartsCoreOption, true);
  }, [option]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}

// table/TableComponent.tsx
import { createComponent } from "@/engine";
import { TableOptions, DEFAULT_OPTIONS } from "./type";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ComponentProps } from '@/engine/types';
import styles from "./index.module.less";

const TableComponent: React.FC<ComponentProps<TableOptions>> = ({ options, width, height }) => {
  const {
    hidden,
    showHeader = true,
    headerFontSize = 14,
    headerBackground = 'rgba(0, 0, 0, 0)',
    headerColor = '#fff',
    headerTextAlign = 'center',
    
    showRows = 4,
    fontSize = 14,
    textAlign = 'center',
    textColor = '#fff',
    oddRowColor = 'rgba(0, 0, 0, 0)',
    evenRowColor = 'rgba(0, 0, 0, 0.16)',
    rowHeight = 40,
    
    enableScroll = false,
    scrollInterval = 1,
    scrollSpeed = 50,
    
    enableRanking = false,
    
    columns = [],
    data = [],
    dataUrl,
    pollingInterval,
  } = options || {};

  const [tableData, setTableData] = useState<Record<string, any>[]>(data);
  // const [currentPage, setCurrentPage] = useState(1);
  const [isScrolling, setIsScrolling] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<any>();
  const pollingTimerRef = useRef<any>();

  const fetchData = useCallback(async () => {
    if (!dataUrl) return;
    
    try {
      const response = await fetch(dataUrl);
      const result = await response.json();
      setTableData(result.data || result);
    } catch (error) {
      console.error('获取表格数据失败:', error);
    }
  }, [dataUrl]);

  // 数据获取effect
  useEffect(() => {
    if (dataUrl) {
      fetchData();
    } else {
      setTableData(data);
    }
  }, [dataUrl, fetchData, data]);

  // 轮询effect
  useEffect(() => {
    if (pollingInterval && pollingInterval > 0 && dataUrl) {
      pollingTimerRef.current = setInterval(fetchData, pollingInterval * 1000);
      return () => {
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current);
        }
      };
    }
  }, [pollingInterval, dataUrl, fetchData]);

  // 滚动effect
  useEffect(() => {
    if (!enableScroll || !scrollRef.current) return;
    
    const startScroll = () => {
      if (!scrollRef.current) return;
      
      let scrollPosition = 0;
      const scrollHeight = scrollRef.current.scrollHeight;
      const clientHeight = scrollRef.current.clientHeight;
      
      if (scrollHeight <= clientHeight) return;
      
      scrollTimerRef.current = setInterval(() => {
        if (!scrollRef.current) return;
        
        scrollPosition += (scrollSpeed / 60);
        
        if (scrollPosition >= scrollHeight - clientHeight) {
          scrollPosition = 0;
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = 0;
            }
          }, scrollInterval * 1000);
        }
        
        scrollRef.current.scrollTop = scrollPosition;
      }, 1000 / 60);
    };
    
    const stopScroll = () => {
      if (scrollTimerRef.current) {
        clearInterval(scrollTimerRef.current);
        scrollTimerRef.current = undefined;
      }
    };
    
    if (enableScroll && !isScrolling) {
      setIsScrolling(true);
      setTimeout(startScroll, scrollInterval * 1000);
    } else {
      stopScroll();
      setIsScrolling(false);
    }
    
    return () => {
      stopScroll();
    };
  }, [enableScroll, scrollInterval, scrollSpeed, isScrolling]);

  // 过滤显示的列
  const visibleColumns = columns.filter(col => col.show !== false);
  
  // 分页数据
  // const displayData = tableData.slice(0, showRows)
  const displayData = React.useMemo(() => {
    const dataToShow = tableData || [];
    return dataToShow.slice(0, showRows)
  }, [tableData, showRows]);

  if (hidden) return null;

  return (
    <div
      className={styles.tableComponent}
      style={{ width, height }}
      ref={tableRef}
    >
      
      <div 
        className={styles.tableContainer}
        style={{ 
          height,
        }}
        ref={scrollRef}
      >
        <table className={styles.tableContent}>
          {showHeader && (
            <thead>
              <tr style={{ 
                background: headerBackground,
                height: rowHeight,
              }}>
                {enableRanking && (
                  <th style={{ 
                    width: 60,
                    color: headerColor,
                    fontSize: headerFontSize,
                    textAlign: headerTextAlign,
                  }}>#</th>
                )}
                {visibleColumns.map((column, index) => (
                  <th 
                    key={column.id || index}
                    style={{ 
                      color: headerColor,
                      fontSize: headerFontSize,
                      textAlign: column.textAlign || headerTextAlign,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                style={{ 
                  height: rowHeight,
                  background: rowIndex % 2 === 0 ? oddRowColor : evenRowColor,
                }}
              >
                {enableRanking && (
                  <td style={{ 
                    color: textColor,
                    fontSize,
                    textAlign,
                    width: 60,
                  }}>
                    {rowIndex + 1}
                  </td>
                )}
                {visibleColumns.map((column, colIndex) => (
                  <td 
                    key={column.id || colIndex}
                    style={{ 
                      color: textColor,
                      fontSize,
                      textAlign: column.textAlign || textAlign,
                    }}
                  >
                    {row[column.key] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* {pagination && (
        <div className="table-pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </button>
          <span>
            第 {currentPage} 页 / 共 {Math.ceil(tableData.length / pageSize)} 页
          </span>
          <button 
            onClick={() => setCurrentPage(prev => 
              prev < Math.ceil(tableData.length / pageSize) ? prev + 1 : prev
            )}
            disabled={currentPage >= Math.ceil(tableData.length / pageSize)}
          >
            下一页
          </button>
        </div>
      )} */}
    </div>
  );
};

export default createComponent<TableOptions>(TableComponent, DEFAULT_OPTIONS);
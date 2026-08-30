import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Sparkles, Copy, Check } from 'lucide-react';

export default function FloatingCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [copied, setCopied] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks to close or just normal focus management
  const handleClear = () => {
    setDisplayValue('');
  };

  const handleBackspace = () => {
    setDisplayValue(prev => prev.slice(0, -1));
  };

  const handleAppend = (char: string) => {
    // Avoid double operators or multiple decimals in one segment if possible
    setDisplayValue(prev => {
      const lastChar = prev.slice(-1);
      const operators = ['+', '-', '*', '/'];
      if (operators.includes(char) && operators.includes(lastChar)) {
        return prev.slice(0, -1) + char; // replace last operator
      }
      return prev + char;
    });
  };

  const handleCalculate = () => {
    if (!displayValue) return;
    try {
      // Safe evaluation of basic math expressions only
      // eslint-disable-next-line no-new-func
      const sanitized = displayValue.replace(/[^0-9+\-*/().]/g, '');
      const result = new Function(`return (${sanitized})`)();
      if (result === Infinity || result === -Infinity || isNaN(result)) {
        setDisplayValue('خطأ');
      } else {
        // Round to 4 decimal places to prevent float precision issues
        const rounded = Math.round(result * 10000) / 10000;
        setDisplayValue(rounded.toString());
      }
    } catch (e) {
      setDisplayValue('خطأ');
    }
  };

  const handleCopy = () => {
    if (!displayValue || displayValue === 'خطأ') return;
    navigator.clipboard.writeText(displayValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Keyboard support for the calculator when it is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleAppend(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleAppend(e.key);
      } else if (e.key === '.') {
        handleAppend('.');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayValue]);

  return (
    <div className="no-print">
      {/* Floating Action Button (FAB) */}
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer select-none group border ${
          isOpen
            ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 scale-100 hover:scale-110'
        }`}
        title={isOpen ? "إغلاق الآلة الحاسبة" : "الآلة الحاسبة العائمة السريعة"}
      >
        {isOpen ? <X size={20} className="animate-in fade-in duration-200" /> : <Calculator size={20} className="stroke-[2.2] animate-pulse" />}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-xs font-black mr-0 group-hover:mr-2 whitespace-nowrap">
          {isOpen ? 'إغلاق الحاسبة' : 'حاسبة سريعة'}
        </span>
      </button>

      {/* Calculator Window Pop-up */}
      {isOpen && (
        <div
          ref={calculatorRef}
          className="fixed bottom-24 right-6 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <Calculator size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">آلة حاسبة عائمة</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-mono">سريعة</span>
            </div>
          </div>

          {/* Screen Display */}
          <div className="p-4 bg-slate-950/5 dark:bg-black/20 border-b border-slate-100 dark:border-slate-800 text-left">
            <div className="min-h-6 text-[11px] font-mono text-slate-400 dark:text-slate-500 break-all overflow-x-auto text-left" dir="ltr">
              {displayValue || '0'}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100/10">
              <button type="button"
                onClick={handleCopy}
                disabled={!displayValue || displayValue === 'خطأ'}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="نسخ الناتج للحافظة"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
              <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 truncate max-w-xs" dir="ltr">
                {displayValue || '0'}
              </span>
            </div>
          </div>

          {/* Grid of keys */}
          <div className="p-3 bg-white dark:bg-slate-900 grid grid-cols-4 gap-2 text-center text-xs font-bold">
            {/* Row 1 */}
            <button type="button"
              onClick={handleClear}
              className="py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl cursor-pointer transition-all"
            >
              C
            </button>
            <button type="button"
              onClick={() => handleAppend('(')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl cursor-pointer transition-all font-mono"
            >
              (
            </button>
            <button type="button"
              onClick={() => handleAppend(')')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl cursor-pointer transition-all font-mono"
            >
              )
            </button>
            <button type="button"
              onClick={() => handleAppend('/')}
              className="py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl cursor-pointer transition-all font-mono"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button type="button"
              onClick={() => handleAppend('7')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              7
            </button>
            <button type="button"
              onClick={() => handleAppend('8')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              8
            </button>
            <button type="button"
              onClick={() => handleAppend('9')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              9
            </button>
            <button type="button"
              onClick={() => handleAppend('*')}
              className="py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl cursor-pointer transition-all font-mono"
            >
              ×
            </button>

            {/* Row 3 */}
            <button type="button"
              onClick={() => handleAppend('4')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              4
            </button>
            <button type="button"
              onClick={() => handleAppend('5')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              5
            </button>
            <button type="button"
              onClick={() => handleAppend('6')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              6
            </button>
            <button type="button"
              onClick={() => handleAppend('-')}
              className="py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl cursor-pointer transition-all font-mono"
            >
              -
            </button>

            {/* Row 4 */}
            <button type="button"
              onClick={() => handleAppend('1')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              1
            </button>
            <button type="button"
              onClick={() => handleAppend('2')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              2
            </button>
            <button type="button"
              onClick={() => handleAppend('3')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              3
            </button>
            <button type="button"
              onClick={() => handleAppend('+')}
              className="py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl cursor-pointer transition-all font-mono"
            >
              +
            </button>

            {/* Row 5 */}
            <button type="button"
              onClick={() => handleAppend('0')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              0
            </button>
            <button type="button"
              onClick={() => handleAppend('.')}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 rounded-2xl cursor-pointer transition-all font-mono"
            >
              .
            </button>
            <button type="button"
              onClick={handleBackspace}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl cursor-pointer transition-all flex items-center justify-center font-mono"
              title="حذف الرقم الأخير"
            >
              ⌫
            </button>
            <button type="button"
              onClick={handleCalculate}
              className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl cursor-pointer transition-all font-mono"
            >
              =
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 text-center select-none">
            اختصارات الكيبورد (الأرقام، الرموز، Enter، Backspace) نشطة.
          </div>
        </div>
      )}
    </div>
  );
}

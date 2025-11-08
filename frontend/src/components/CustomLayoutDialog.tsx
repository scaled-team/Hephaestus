import React, { useState } from 'react';
import { X, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomLayoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (rows: number, cols: number) => void;
  currentRows?: number;
  currentCols?: number;
}

const CustomLayoutDialog: React.FC<CustomLayoutDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  currentRows = 2,
  currentCols = 2,
}) => {
  const [rows, setRows] = useState(currentRows);
  const [cols, setCols] = useState(currentCols);

  const handleApply = () => {
    if (rows >= 1 && rows <= 10 && cols >= 1 && cols <= 10) {
      onApply(rows, cols);
      onClose();
    }
  };

  const handleRowsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setRows(num);
    }
  };

  const handleColsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setCols(num);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[90]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-[100] w-full max-w-md mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Grid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Custom Grid Layout</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Input fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cols" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Columns
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="cols"
                        min="1"
                        max="10"
                        value={cols}
                        onChange={(e) => handleColsChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                        <button
                          onClick={() => setCols(Math.min(10, cols + 1))}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => setCols(Math.max(1, cols - 1))}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1-10 columns</p>
                  </div>

                  <div>
                    <label htmlFor="rows" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rows
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="rows"
                        min="1"
                        max="10"
                        value={rows}
                        onChange={(e) => handleRowsChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                        <button
                          onClick={() => setRows(Math.min(10, rows + 1))}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => setRows(Math.max(1, rows - 1))}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1-10 rows</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: rows * cols }).map((_, index) => (
                        <div
                          key={index}
                          className="bg-blue-100 border border-blue-300 rounded aspect-square"
                          style={{
                            minHeight: Math.max(20, 120 / Math.max(rows, cols)) + 'px',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {cols} × {rows} grid ({cols * rows} panels)
                  </p>
                </div>

                {/* Quick presets */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setRows(1); setCols(1); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      1×1
                    </button>
                    <button
                      onClick={() => { setRows(2); setCols(2); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      2×2
                    </button>
                    <button
                      onClick={() => { setRows(3); setCols(3); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      3×3
                    </button>
                    <button
                      onClick={() => { setRows(2); setCols(3); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      3×2
                    </button>
                    <button
                      onClick={() => { setRows(1); setCols(4); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      4×1
                    </button>
                    <button
                      onClick={() => { setRows(4); setCols(4); }}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      4×4
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Apply Layout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomLayoutDialog;
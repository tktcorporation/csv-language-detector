import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, Check, X } from 'lucide-react'
import Papa from 'papaparse'
import * as franc from 'franc'
import langCodes from './langCodes'

interface LanguageResult {
  label: string
  language: string
  text: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [languageResults, setLanguageResults] = useState<LanguageResult[]>([])
  const [stats, setStats] = useState<{ rows: number; labels: number; languages: Set<string> }>({ rows: 0, labels: 0, languages: new Set() })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getLanguageName = (langCode: string): string => {
    if (langCode === 'und') {
      return 'Undetermined'
    }
    return langCodes[langCode] || langCode
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setError(null)
      Papa.parse(uploadedFile, {
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as string[]
            const hasHeaders = firstRow.every(cell => typeof cell === 'string' && cell.trim() !== '')
            
            if (hasHeaders) {
              setColumns(firstRow.slice(1)) // Exclude the first column (labels)
              setSelectedColumn(firstRow[1] || '') // Select the second column by default
            } else {
              setColumns(firstRow.map((_, index) => `Column ${index + 1}`))
              setSelectedColumn('Column 2') // Select the second column by default
            }
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`)
        }
      })
    }
  }

  const handleColumnSelect = useCallback((column: string) => {
    setSelectedColumn(column)
    setIsProcessing(true)
    setError(null)

    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const data = results.data as Record<string, string>[]
          const hasHeaders = Object.keys(data[0]).every(key => key !== '')
          const labelColumn = hasHeaders ? Object.keys(data[0])[0] : '0'
          
          const languageResults = data
            .filter((row) => row[column] && typeof row[column] === 'string')
            .map((row, index) => {
              const detectedLang = franc.franc(row[column])
              return {
                label: hasHeaders ? row[labelColumn] : `Row ${index + 1}`,
                language: getLanguageName(detectedLang),
                text: row[column].substring(0, 50) + (row[column].length > 50 ? '...' : '')
              }
            })

          setLanguageResults(languageResults)
          setStats({
            rows: data.length,
            labels: hasHeaders ? new Set(data.map(row => row[labelColumn])).size : data.length,
            languages: new Set(languageResults.map(result => result.language))
          })
          setIsProcessing(false)
        },
        header: true,
        error: (error) => {
          setError(`Error processing CSV: ${error.message}`)
          setIsProcessing(false)
        }
      })
    }
  }, [file])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">CSV Language Detector</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <div className="mb-4">
          <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="csvFile"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV file</p>
              </div>
              <input
                id="csvFile"
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </label>
          </div>
        </div>

        {file && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              File uploaded: <span className="font-semibold">{file.name}</span>
            </p>
          </div>
        )}

        {columns.length > 0 && (
          <div className="mb-4">
            <label htmlFor="columnSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Select Column for Language Detection
            </label>
            <select
              id="columnSelect"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              onChange={(e) => handleColumnSelect(e.target.value)}
              value={selectedColumn}
            >
              <option value="">Select a column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center space-x-2 text-indigo-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span>Processing...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {languageResults.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Language Detection Results:</h2>
            <div className="bg-gray-100 p-4 rounded-md mb-4">
              <p><strong>Total Rows:</strong> {stats.rows}</p>
              <p><strong>Unique Labels:</strong> {stats.labels}</p>
              <p><strong>Detected Languages:</strong> {Array.from(stats.languages).join(', ')}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded-md max-h-60 overflow-y-auto">
              {languageResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-2 mb-2 p-2 bg-white rounded shadow-sm">
                  <FileText className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                  <div className="flex-grow">
                    <div className="font-semibold text-sm text-gray-700">{result.label}</div>
                    <div className="text-sm text-gray-600">
                      Language: {result.language === 'Undetermined' 
                        ? <span className="text-yellow-600">Undetermined (text may be too short or ambiguous)</span> 
                        : result.language}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{result.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
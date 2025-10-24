import React, { useState } from 'react';
import { generateTimesheet } from './services/geminiService';
import { downloadTextFile } from './utils/fileUtils';
import { FileUpload } from './components/FileUpload';
import { VoiceRecorder } from './components/VoiceRecorder';
import { DownloadIcon, LoadingSpinner } from './components/Icon';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const App: React.FC = () => {
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [calendarText, setCalendarText] = useState<string>('');
    const [narration, setNarration] = useState<string>('');
    const [weekStartDate, setWeekStartDate] = useState<string>(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return monday.toISOString().split('T')[0];
    });

    const [generatedTimesheet, setGeneratedTimesheet] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = (narration.trim() || calendarText.trim() || screenshotFile) && weekStartDate;

    const handleSubmit = async () => {
        if (!isFormValid) {
            setError("Please provide calendar info (screenshot or text) or a voice narration, and select a start date.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setGeneratedTimesheet('');

        try {
            const result = await generateTimesheet({
                imageFile: screenshotFile,
                calendarText,
                narration,
                startDate: weekStartDate,
            });
            
            if (result.startsWith('Error:')) {
                setError(result);
            } else {
                setGeneratedTimesheet(result);
            }

        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!generatedTimesheet) return;
        const filename = `timesheet-for-week-commencing-${weekStartDate}.md`;
        downloadTextFile(generatedTimesheet, filename);
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                        AI Timesheet Generator
                    </h1>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                        Upload your calendar, narrate your week, and let AI do the rest.
                    </p>
                </header>

                <main className="space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-6">
                        <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-700 pb-2">1. Provide Your Weekly Data</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="week-start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Week Commencing Date
                                </label>
                                <input
                                    type="date"
                                    id="week-start-date"
                                    value={weekStartDate}
                                    onChange={(e) => setWeekStartDate(e.target.value)}
                                    className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <FileUpload onFileSelect={setScreenshotFile} />

                        <div>
                            <label htmlFor="calendar-text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Or Paste Calendar Entries (Optional)
                            </label>
                            <textarea
                                id="calendar-text"
                                rows={5}
                                value={calendarText}
                                onChange={(e) => setCalendarText(e.target.value)}
                                placeholder="e.g., Monday 10am: Project sync..."
                                className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>

                        <VoiceRecorder onTranscriptionComplete={setNarration} />
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={handleSubmit}
                            disabled={!isFormValid || isLoading}
                            className="w-full md:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed md:text-lg transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner className="w-6 h-6 mr-3" />
                                    Generating...
                                </>
                            ) : "Generate Timesheet"}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    
                    {generatedTimesheet && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-4">
                             <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">
                                <h2 className="text-2xl font-bold">2. Your Generated Timesheet</h2>
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-900"
                                >
                                    <DownloadIcon className="w-5 h-5 mr-2"/>
                                    Download (.md)
                                </button>
                            </div>
                            <MarkdownRenderer content={generatedTimesheet} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;

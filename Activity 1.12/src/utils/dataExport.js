import { saveAs } from 'file-saver';

/**
 * Export thermal experiment data to CSV format
 * @param {Array} dataLog - Array of data points {time, temperature, iceMass, waterMass, phase}
 * @param {string} filename - Output filename
 */
export function exportDataToCSV(dataLog, filename = 'thermal_experiment_data.csv') {
    if (!dataLog || dataLog.length === 0) {
        console.warn('No data to export');
        return;
    }

    // CSV header
    const headers = ['Time (s)', 'Temperature (°C)', 'Ice Mass (kg)', 'Water Mass (kg)', 'Phase'];

    // Convert data points to CSV rows
    const startTime = dataLog[0].time;
    const rows = dataLog.map((point) => {
        const elapsedSeconds = ((point.time - startTime) / 1000).toFixed(2);
        return [
            elapsedSeconds,
            point.temperature.toFixed(2),
            point.iceMass.toFixed(6),
            point.waterMass.toFixed(6),
            point.phase,
        ].join(',');
    });

    // Combine header and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, filename);
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp) {
    return `${temp.toFixed(1)}°C`;
}

/**
 * Format mass for display
 */
export function formatMass(mass) {
    return `${(mass * 1000).toFixed(1)}g`;
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase) {
    const phaseNames = {
        solid: 'Solid (Ice)',
        melting: 'Melting',
        liquid: 'Liquid (Water)',
        boiling: 'Boiling',
        vapor: 'Vapor (Steam)',
    };
    return phaseNames[phase] || phase;
}

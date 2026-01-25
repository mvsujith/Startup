import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function TemperatureGraph({ dataLog }) {
    if (!dataLog || dataLog.length === 0) {
        return (
            <div style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px',
            }}>
                No data yet. Start the burner to begin recording.
            </div>
        );
    }

    // Convert timestamps to elapsed seconds
    const startTime = dataLog[0].time;
    const chartData = dataLog.map((point) => ({
        time: ((point.time - startTime) / 1000).toFixed(1),
        temperature: point.temperature.toFixed(1),
    }));

    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                    dataKey="time"
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '11px' }}
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.6)' }}
                />
                <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    style={{ fontSize: '11px' }}
                    label={{ value: '°C', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
                />
                <Tooltip
                    contentStyle={{
                        background: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(96, 165, 250, 0.5)',
                        borderRadius: '6px',
                        fontSize: '12px',
                    }}
                    labelStyle={{ color: '#60a5fa' }}
                />

                {/* Reference lines for phase transitions */}
                <ReferenceLine y={0} stroke="rgba(59, 130, 246, 0.5)" strokeDasharray="3 3" label={{ value: 'Melting', fill: '#3b82f6', fontSize: 10 }} />
                <ReferenceLine y={100} stroke="rgba(239, 68, 68, 0.5)" strokeDasharray="3 3" label={{ value: 'Boiling', fill: '#ef4444', fontSize: 10 }} />

                <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

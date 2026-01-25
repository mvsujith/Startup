import { useLabStore } from '../../store/useLabStore';
import './LabUI.css';

export function ComponentPalette() {
    const { hasBeaker, hasThermometer, hasBurner, hasIce, placeBeaker, placeThermometer, placeBurner, placeIce } = useLabStore();

    const handleDragStart = (e, type) => {
        e.dataTransfer.setData('componentType', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const items = [
        {
            type: 'beaker',
            icon: '🧪',
            name: 'Beaker',
            desc: '150 mL capacity',
            placed: hasBeaker,
            onPlace: placeBeaker,
        },
        {
            type: 'ice',
            icon: '🧊',
            name: 'Ice Cube',
            desc: '50g mass',
            placed: hasIce,
            onPlace: placeIce,
        },
        {
            type: 'thermometer',
            icon: '🌡️',
            name: 'Thermometer',
            desc: '-10°C to 110°C',
            placed: hasThermometer,
            onPlace: placeThermometer,
        },
        {
            type: 'burner',
            icon: '🔥',
            name: 'Burner',
            desc: '1000W power',
            placed: hasBurner,
            onPlace: placeBurner,
        },
    ];

    return (
        <div className="component-palette">
            <div className="palette-title">Lab Equipment</div>
            {items.map((item) => (
                <div
                    key={item.type}
                    className="palette-item"
                    draggable={!item.placed}
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => !item.placed && item.onPlace()}
                    style={{
                        opacity: item.placed ? 0.5 : 1,
                        cursor: item.placed ? 'not-allowed' : 'grab',
                    }}
                >
                    <span className="palette-item-icon">{item.icon}</span>
                    <span className="palette-item-name">{item.name}</span>
                    <span className="palette-item-desc">{item.placed ? '✓ Placed' : item.desc}</span>
                </div>
            ))}
        </div>
    );
}

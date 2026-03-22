import React from 'react';

const EQUIPMENT = [
  { id: 'arrow', name: 'Arrow', path: '/arrow.glb', icon: '🏹' },
  { id: 'bow', name: 'Simple Bow', path: '/simple_bow.glb', icon: '🏹' },
];

export default function EquipmentPanel() {
  const handleDragStart = (e, path) => {
    e.dataTransfer.setData("assetPath", path);
  };

  return (
    <div className="equipment-panel">
      <div className="panel-header">
        <h2>Lab Equipment</h2>
        <p>Drag items into the scene to inspect them.</p>
      </div>

      <div className="equipment-list">
        {EQUIPMENT.map((item) => (
          <div
            key={item.id}
            className="equipment-card"
            draggable="true"
            onDragStart={(e) => handleDragStart(e, item.path)}
          >
            <div className="equipment-icon">{item.icon}</div>
            <div className="equipment-info">
              <span className="equipment-name">{item.name}</span>
              <span className="equipment-file">{item.id}.glb</span>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <p>Drop items on the blue grid platform.</p>
      </div>
    </div>
  );
}

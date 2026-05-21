import React, { useState } from 'react';
import { useFirebase, type Client, type Task } from '../context/FirebaseContext';
import { Calendar, Trash2, Check, Plus, X } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  isSelected: boolean;
  onSelect: () => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, isSelected, onSelect }) => {
  const { updateClient, deleteClient, rolloverClientTasks } = useFirebase();
  const [isFlipping, setIsFlipping] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [puffingTasks, setPuffingTasks] = useState<string[]>([]);

  // Cycle statuses: In Review -> In Progress -> Completed -> In Review
  const cycleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting card when clicking badge
    if (isFlipping) return;

    setIsFlipping(true);
    let nextStatus: Client['status'] = 'In Progress';
    if (client.status === 'In Progress') nextStatus = 'Completed';
    else if (client.status === 'Completed') nextStatus = 'In Review';
    else if (client.status === 'In Review') nextStatus = 'In Progress';

    const updatedClient: Client = {
      ...client,
      status: nextStatus
    };

    // Timeout matching css transition
    setTimeout(async () => {
      await updateClient(updatedClient);
      setIsFlipping(false);
    }, 400);
  };

  // Toggle task complete status
  const toggleTask = async (taskId: string, currentVal: boolean) => {
    const updatedTasks = client.tasks.map(t => 
      t.id === taskId ? { ...t, completed: !currentVal } : t
    );
    await updateClient({ ...client, tasks: updatedTasks });
  };

  // Add a task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: 'task-' + Math.random().toString(36).substring(2, 9),
      text: newTaskText.trim(),
      completed: false,
      dueDate: new Date().toISOString().split('T')[0]
    };

    const updatedClient = {
      ...client,
      tasks: [...client.tasks, newTask]
    };

    await updateClient(updatedClient);
    setNewTaskText('');
    setShowAddTask(false);
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    const updatedTasks = client.tasks.filter(t => t.id !== taskId);
    await updateClient({ ...client, tasks: updatedTasks });
  };

  // Single-Click Rollover action
  const handleRollover = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Identify completed tasks to apply puff animation
    const completedTaskIds = client.tasks.filter(t => t.completed).map(t => t.id);
    if (completedTaskIds.length === 0 && client.tasks.length === 0) return;

    // Trigger local puff-out animation
    setPuffingTasks(completedTaskIds);

    // Wait for the animation to finish (400ms) before committing backend update
    setTimeout(async () => {
      await rolloverClientTasks(client.id);
      setPuffingTasks([]);
    }, 400);
  };

  // Badge configuration mapping
  const getBadgeConfig = () => {
    switch (client.status) {
      case 'In Review':
        return { 
          class: 'in-review', 
          text: 'In Review', 
          icon: <span className="status-dot" style={{ background: 'var(--color-danger)' }}></span> 
        };
      case 'In Progress':
        return { 
          class: 'in-progress', 
          text: 'In Progress', 
          icon: <span className="status-dot" style={{ background: 'var(--color-warning)' }}></span> 
        };
      case 'Completed':
        return { 
          class: 'completed', 
          text: 'Completed', 
          icon: <span className="status-dot" style={{ background: 'var(--color-success)' }}></span> 
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <div 
      className={`client-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="client-card-header">
        <div>
          <div className="client-brand">{client.brandName}</div>
          <div className="client-project">{client.projectTitle}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div className="client-budget">${client.budget.toLocaleString()}</div>
          <div 
            className={`velocity-badge ${badge.class} ${isFlipping ? 'badge-flipping' : ''}`}
            onClick={cycleStatus}
            title="Click to flip velocity status"
          >
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        </div>
      </div>

      {/* Miniature Task List */}
      <div className="card-tasks">
        {client.tasks.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-ops-muted)', padding: '0.25rem 0' }}>
            No operational tasks logged.
          </div>
        ) : (
          client.tasks.map(task => {
            const isPuffing = puffingTasks.includes(task.id);
            return (
              <div 
                key={task.id} 
                className={`task-item ${task.completed ? 'completed' : ''} ${isPuffing ? 'task-puff-out' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <input 
                  type="checkbox" 
                  className="task-checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id, task.completed)}
                />
                <span className="task-item-text" title={task.text}>{task.text}</span>
                <span className="task-due">{task.dueDate.split('-').slice(1).join('/')}</span>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="btn-icon-danger"
                  style={{ opacity: 0.3, padding: '0.1rem' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}

        {showAddTask ? (
          <form onSubmit={handleAddTask} className="line-item-row" style={{ marginTop: '0.5rem', gridTemplateColumns: '1fr auto auto' }} onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              className="form-input" 
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
              placeholder="e.g. Wireframe core landing views"
              autoFocus
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
              <Check size={12} />
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.6rem', borderRadius: '4px' }} onClick={() => setShowAddTask(false)}>
              <X size={12} />
            </button>
          </form>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAddTask(true); }}
            className="btn-rollover" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.4rem', borderStyle: 'dashed' }}
          >
            <Plus size={12} /> Add Task
          </button>
        )}
      </div>

      <div className="card-footer">
        <button 
          onClick={handleRollover}
          className="btn-rollover"
          title="Archive completed tasks and rollover active tasks to the next business day"
        >
          <Calendar size={13} />
          <span>Rollover Active Work</span>
        </button>
        
        <button 
          onClick={(e) => { e.stopPropagation(); if (confirm(`Remove client ${client.brandName}?`)) deleteClient(client.id); }}
          className="btn-icon-danger"
          title="Delete Client"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

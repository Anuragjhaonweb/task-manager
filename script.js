class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentCategory = 'all';
        this.draggedTask = null;
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.render();
        this.updateStats();
    }

    loadTasks() {
        const saved = localStorage.getItem('tasks');
        this.tasks = saved ? JSON.parse(saved) : [
            { id: 1, text: 'Complete project proposal', completed: false, category: 'work' },
            { id: 2, text: 'Prepare meeting agenda', completed: false, category: 'work' },
            { id: 3, text: 'Buy groceries', completed: true, category: 'personal' },
            { id: 4, text: 'Call dentist', completed: false, category: 'personal' },
            { id: 5, text: 'Schedule car maintenance', completed: false, category: 'personal' }
        ];
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.updateStats();
    }

    addTask(text, category = 'personal') {
        const task = {
            id: Date.now(),
            text: text.trim(),
            completed: false,
            category: category
        };
        
        this.tasks.unshift(task);
        this.saveTasks();
        this.render();
        
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.classList.add('adding');
            }
        }, 50);
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.render();
        }
    }

    deleteTask(id) {
        const taskElement = document.querySelector(`[data-task-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.add('removing');
            setTimeout(() => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveTasks();
                this.render();
            }, 300);
        }
    }

    editTask(id, newText) {
        const task = this.tasks.find(t => t.id === id);
        if (task && newText.trim()) {
            task.text = newText.trim();
            this.saveTasks();
            this.render();
        }
    }

    getFilteredTasks() {
        if (this.currentCategory === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.category === this.currentCategory);
    }

    groupTasksByCategory() {
        const filtered = this.getFilteredTasks();
        const groups = {};
        
        filtered.forEach(task => {
            const category = task.category;
            if (!groups[category]) {
                groups[category] = {
                    name: this.getCategoryName(category),
                    tasks: []
                };
            }
            groups[category].tasks.push(task);
        });
        
        return groups;
    }

    getCategoryName(category) {
        const names = {
            'work': 'Work Tasks',
            'personal': 'Personal Tasks',
            'shopping': 'Shopping List',
            'learning': 'Learning Goals'
        };
        return names[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Tasks';
    }

    setCategory(category) {
        this.currentCategory = category;
        this.render();
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
    }

    render() {
        const container = document.getElementById('taskGroups');
        const groups = this.groupTasksByCategory();
        
        if (Object.keys(groups).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">No tasks yet</div>
                    <div class="empty-state-subtext">Add your first task to get started. Tasks will be organized by category.</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = Object.entries(groups).map(([category, group]) => `
            <div class="task-group" data-category="${category}">
                <div class="group-header">
                    <h3 class="group-title">${group.name}</h3>
                    <span class="task-count">${group.tasks.length}</span>
                </div>
                <ul class="task-list" data-category="${category}">
                    ${group.tasks.map(task => this.renderTask(task)).join('')}
                </ul>
            </div>
        `).join('');
        
        this.setupTaskListeners();
    }

    renderTask(task) {
        return `
            <li class="task-item ${task.completed ? 'completed' : ''}" 
                data-task-id="${task.id}" 
                draggable="true">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="taskManager.toggleTask(${task.id})">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="task-text ${task.completed ? 'completed' : ''}" 
                     onclick="startEditing(${task.id}, this)">
                    ${task.text}
                </div>
                <div class="task-actions">
                    <button class="task-action edit" 
                            onclick="startEditing(${task.id}, this.parentElement.previousElementSibling)">
                        ✏️
                    </button>
                    <button class="task-action delete" 
                            onclick="taskManager.deleteTask(${task.id})">
                        🗑️
                    </button>
                </div>
            </li>
        `;
    }

    setupTaskListeners() {
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedTask = parseInt(e.target.dataset.taskId);
                e.target.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                this.draggedTask = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetId = parseInt(e.target.closest('.task-item').dataset.taskId);
                if (this.draggedTask && this.draggedTask !== targetId) {
                    this.reorderTasks(this.draggedTask, targetId);
                }
            });
        });
    }

    reorderTasks(draggedId, targetId) {
        const draggedIndex = this.tasks.findIndex(t => t.id === draggedId);
        const targetIndex = this.tasks.findIndex(t => t.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const draggedTask = this.tasks.splice(draggedIndex, 1)[0];
            this.tasks.splice(targetIndex, 0, draggedTask);
            this.saveTasks();
            this.render();
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                this.setCategory(item.dataset.category);
            });
        });
        
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = e.target;
                const text = input.value.trim();
                
                if (text) {
                    const category = this.currentCategory === 'all' ? 'personal' : this.currentCategory;
                    this.addTask(text, category);
                    input.value = '';
                }
            }
        });
    }
}

const taskManager = new TaskManager();

function startEditing(taskId, textElement) {
    const task = taskManager.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'task-text editing';
    
    input.addEventListener('blur', () => finishEditing(taskId, input, textElement));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishEditing(taskId, input, textElement);
        }
    });
    
    textElement.style.display = 'none';
    textElement.parentElement.insertBefore(input, textElement);
    input.focus();
}

function finishEditing(taskId, input, textElement) {
    const newText = input.value.trim();
    if (newText) {
        taskManager.editTask(taskId, newText);
    }
    
    input.remove();
    textElement.style.display = 'block';
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.dataset.theme === 'dark') {
        body.dataset.theme = 'light';
        themeToggle.textContent = '🌙';
    } else {
        body.dataset.theme = 'dark';
        themeToggle.textContent = '☀️';
    }
    
    localStorage.setItem('theme', body.dataset.theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.dataset.theme = 'dark';
        document.getElementById('themeToggle').textContent = '☀️';
    } else {
        document.body.dataset.theme = 'light';
        document.getElementById('themeToggle').textContent = '🌙';
    }
}

document.getElementById('themeToggle').addEventListener('click', toggleTheme);
initializeTheme();
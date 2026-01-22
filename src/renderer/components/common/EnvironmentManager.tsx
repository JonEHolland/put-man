import { useState, useEffect } from 'react'
import { useEnvironmentStore } from '../../stores/environmentStore'
import type { Environment, EnvironmentVariable } from '../../../shared/types/models'
import { v4 as uuidv4 } from 'uuid'

interface EnvironmentManagerProps {
  onClose: () => void
}

export default function EnvironmentManager({ onClose }: EnvironmentManagerProps) {
  const {
    environments,
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    updateVariables
  } = useEnvironmentStore()

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null)
  const [isCreatingEnv, setIsCreatingEnv] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
  const [editingEnvName, setEditingEnvName] = useState('')
  const [localVariables, setLocalVariables] = useState<EnvironmentVariable[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadEnvironments()
  }, [loadEnvironments])

  const selectedEnv = environments.find((e) => e.id === selectedEnvId)

  useEffect(() => {
    if (selectedEnv) {
      setLocalVariables([...selectedEnv.variables])
      setHasUnsavedChanges(false)
    }
  }, [selectedEnvId])

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) return
    const env = await createEnvironment(newEnvName.trim())
    setSelectedEnvId(env.id)
    setNewEnvName('')
    setIsCreatingEnv(false)
  }

  const handleRenameEnvironment = async (id: string) => {
    if (!editingEnvName.trim()) return
    await updateEnvironment(id, { name: editingEnvName.trim() })
    setEditingEnvId(null)
    setEditingEnvName('')
  }

  const handleDeleteEnvironment = async (id: string) => {
    if (!confirm('Delete this environment? This cannot be undone.')) return
    await deleteEnvironment(id)
    if (selectedEnvId === id) {
      setSelectedEnvId(null)
      setLocalVariables([])
    }
  }

  const handleAddVariable = () => {
    const newVar: EnvironmentVariable = {
      id: uuidv4(),
      key: '',
      value: '',
      enabled: true
    }
    setLocalVariables([...localVariables, newVar])
    setHasUnsavedChanges(true)
  }

  const handleUpdateVariable = (id: string, updates: Partial<EnvironmentVariable>) => {
    setLocalVariables(localVariables.map((v) => (v.id === id ? { ...v, ...updates } : v)))
    setHasUnsavedChanges(true)
  }

  const handleDeleteVariable = (id: string) => {
    setLocalVariables(localVariables.filter((v) => v.id !== id))
    setHasUnsavedChanges(true)
  }

  const handleSaveVariables = async () => {
    if (!selectedEnvId) return
    await updateVariables(selectedEnvId, localVariables)
    setHasUnsavedChanges(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-panel border border-panel-border rounded-lg shadow-xl w-[700px] h-[500px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <h2 className="text-lg font-semibold text-white">Manage Environments</h2>
          <button className="text-gray-400 hover:text-gray-200" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Environment list */}
          <div className="w-48 border-r border-panel-border flex flex-col">
            <div className="p-2 border-b border-panel-border">
              {isCreatingEnv ? (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Environment name"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateEnvironment()
                      if (e.key === 'Escape') setIsCreatingEnv(false)
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      className="btn btn-primary text-xs flex-1"
                      onClick={handleCreateEnvironment}
                    >
                      Create
                    </button>
                    <button
                      className="btn btn-secondary text-xs flex-1"
                      onClick={() => setIsCreatingEnv(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-secondary text-xs w-full"
                  onClick={() => setIsCreatingEnv(true)}
                >
                  + New Environment
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {environments.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No environments</div>
              ) : (
                environments.map((env) => (
                  <div
                    key={env.id}
                    className={`flex items-center px-3 py-2 cursor-pointer ${
                      selectedEnvId === env.id
                        ? 'bg-sidebar-hover text-white'
                        : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200'
                    }`}
                    onClick={() => setSelectedEnvId(env.id)}
                  >
                    {editingEnvId === env.id ? (
                      <input
                        type="text"
                        className="input text-sm flex-1"
                        value={editingEnvName}
                        onChange={(e) => setEditingEnvName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameEnvironment(env.id)
                          if (e.key === 'Escape') setEditingEnvId(null)
                        }}
                        onBlur={() => handleRenameEnvironment(env.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-sm truncate">{env.name}</span>
                        {env.isActive && (
                          <span className="text-xs text-green-400 mr-1">Active</span>
                        )}
                        <div className="flex gap-1">
                          <button
                            className="p-1 hover:bg-gray-600 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingEnvId(env.id)
                              setEditingEnvName(env.name)
                            }}
                            title="Rename"
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="p-1 hover:bg-red-600/50 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEnvironment(env.id)
                            }}
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Variables editor */}
          <div className="flex-1 flex flex-col">
            {selectedEnv ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-panel-border">
                  <h3 className="text-sm font-medium text-gray-200">
                    Variables for {selectedEnv.name}
                  </h3>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary text-xs" onClick={handleAddVariable}>
                      + Add Variable
                    </button>
                    {hasUnsavedChanges && (
                      <button className="btn btn-primary text-xs" onClick={handleSaveVariables}>
                        Save Changes
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {localVariables.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No variables defined</p>
                      <p className="text-sm mt-1">
                        Add variables to use in requests as {'{{variable_name}}'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-gray-500 px-1">
                        <div className="w-6"></div>
                        <div>Variable</div>
                        <div>Value</div>
                        <div className="w-8"></div>
                      </div>

                      {/* Variables */}
                      {localVariables.map((variable) => (
                        <div
                          key={variable.id}
                          className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center"
                        >
                          <input
                            type="checkbox"
                            checked={variable.enabled}
                            onChange={(e) =>
                              handleUpdateVariable(variable.id, { enabled: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            className="input text-sm"
                            placeholder="variable_name"
                            value={variable.key}
                            onChange={(e) =>
                              handleUpdateVariable(variable.id, { key: e.target.value })
                            }
                          />
                          <input
                            type="text"
                            className="input text-sm"
                            placeholder="value"
                            value={variable.value}
                            onChange={(e) =>
                              handleUpdateVariable(variable.id, { value: e.target.value })
                            }
                          />
                          <button
                            className="p-1 hover:bg-red-600/50 rounded text-gray-400 hover:text-red-400"
                            onClick={() => handleDeleteVariable(variable.id)}
                            title="Delete variable"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>Select an environment to manage variables</p>
                  <p className="text-sm mt-1">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@blinkdotnew/ui'
import { Plus, Sparkles, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { RULE_ACTION_LABELS, RULE_PRESETS, RULE_TRIGGER_LABELS } from '@/lib/rules'
import { RULE_ACTIONS, RULE_TRIGGERS, TASK_ENERGIES, TASK_PRIORITIES, TASK_STATUSES, type AutomationRule } from '@/types/workspace'

/**
 * Butler-style automation, exposed honestly.
 *
 * A rule is a sentence: *when* a task is created or completed, *if* it matches,
 * *then* change one thing. One action, no cascading — the whole point is that a
 * user can predict the outcome without running it.
 */
const VALUE_CHOICES: Partial<Record<AutomationRule['action'], string[]>> = {
  setPriority: [...TASK_PRIORITIES],
  setStatus: [...TASK_STATUSES],
  setEnergy: [...TASK_ENERGIES],
}

export function AutomationsCard() {
  const { rules, addRule, updateRule, deleteRule, projectNames } = useWorkspace()
  const [draft, setDraft] = useState<Omit<AutomationRule, 'id'>>({
    name: '',
    enabled: true,
    trigger: 'taskCreated',
    matchProject: '',
    matchStatus: '',
    matchText: '',
    action: 'setPriority',
    value: 'High',
  })

  const create = () => {
    if (!draft.name.trim()) {
      toast.error('Give the rule a name')
      return
    }
    addRule({ ...draft, name: draft.name.trim() })
    setDraft({ ...draft, name: '', matchText: '' })
    toast.success('Rule added — it applies from now on')
  }

  const addPreset = () => {
    for (const preset of RULE_PRESETS) {
      if (rules.some((rule) => rule.name === preset.name)) continue
      addRule(preset)
    }
    toast.success('Starter rules added (most are disabled — switch on what you want)')
  }

  const values = VALUE_CHOICES[draft.action]

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Automations</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{rules.length} rule(s)</span>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Rules run the moment a task is created, completed or moved — no background jobs, no surprises. They never
          trigger each other.
        </p>

        {rules.length === 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="flex-1 text-xs text-muted-foreground">
              No rules yet. Add a starter set, or build one below.
            </p>
            <Button size="sm" variant="outline" onClick={addPreset}>
              Add starter rules
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })}
                    className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                    aria-label={`Enable ${rule.name}`}
                  />
                  {rule.name}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteRule(rule.id)}
                  aria-label={`Delete rule ${rule.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {RULE_TRIGGER_LABELS[rule.trigger]}
                {rule.matchProject && ` · in ${rule.matchProject}`}
                {rule.matchStatus && ` · status ${rule.matchStatus}`}
                {rule.matchText && ` · title contains “${rule.matchText}”`}
                {' → '}
                {RULE_ACTION_LABELS[rule.action]}
                {rule.value && `: ${rule.value}`}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New rule</p>

          <Input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Rule name, e.g. Studio work is deep work"
            aria-label="Rule name"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={draft.trigger}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, trigger: value as AutomationRule['trigger'] }))}
            >
              <SelectTrigger aria-label="Trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TRIGGERS.map((trigger) => (
                  <SelectItem key={trigger} value={trigger}>
                    {RULE_TRIGGER_LABELS[trigger]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={draft.action}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, action: value as AutomationRule['action'] }))}
            >
              <SelectTrigger aria-label="Action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {RULE_ACTION_LABELS[action]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              list="rule-project-options"
              value={draft.matchProject}
              onChange={(event) => setDraft((prev) => ({ ...prev, matchProject: event.target.value }))}
              placeholder="Only in project (optional)"
              aria-label="Only in project"
            />
            <datalist id="rule-project-options">
              {projectNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <Input
              value={draft.matchText}
              onChange={(event) => setDraft((prev) => ({ ...prev, matchText: event.target.value }))}
              placeholder="Title contains (optional)"
              aria-label="Title contains"
            />
          </div>

          {values ? (
            <Select value={draft.value} onValueChange={(value) => setDraft((prev) => ({ ...prev, value }))}>
              <SelectTrigger aria-label="Value">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {values.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={draft.value}
              onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
              placeholder={draft.action === 'scheduleInDays' ? 'Days from today (e.g. 3)' : 'Value (e.g. deep)'}
              aria-label="Value"
            />
          )}

          <Button size="sm" onClick={create} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add rule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

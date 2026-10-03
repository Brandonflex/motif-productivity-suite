import { useRef, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Page,
  PageBody,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@blinkdotnew/ui'
import { AlertTriangle, Database, Download, HardDrive, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatTimestamp } from '@/lib/dates'
import { backupFilename, parseBackup, readFileAsText } from '@/lib/storage'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ThemeToggle } from '@/components/app-shell/ThemeToggle'
import type { WorkspaceSnapshot } from '@/types/workspace'

export function SettingsPage() {
  useDocumentTitle('Settings')
  const { tasks, projects, stats, storage, exportWorkspace, replaceWorkspace, resetWorkspace } = useWorkspace()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ snapshot: WorkspaceSnapshot; exportedAt: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const workspaceBytes = new Blob([JSON.stringify({ tasks, projects })]).size

  const handleExport = () => {
    exportWorkspace()
    toast.success('Backup downloaded')
  }

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return

    let result
    try {
      result = parseBackup(await readFileAsText(file))
    } catch {
      toast.error('That file could not be read. Please choose a JSON backup.')
      return
    }

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    setPendingImport({ snapshot: result.snapshot, exportedAt: result.exportedAt })
  }

  const confirmImport = () => {
    if (!pendingImport) return
    const { tasks: importedTasks, projects: importedProjects } = pendingImport.snapshot
    replaceWorkspace(pendingImport.snapshot)
    setPendingImport(null)
    toast.success(`Imported ${importedTasks.length} tasks and ${importedProjects.length} projects`)
  }

  const handleReset = () => {
    resetWorkspace()
    setConfirmReset(false)
    toast.success('Workspace reset to sample data')
  }

  return (
    <Page>
      <PageHeader className="sticky top-14 z-20 border-border bg-background/95 backdrop-blur md:top-0">
        <div className="min-w-0">
          <PageTitle>Settings</PageTitle>
          <PageDescription>Appearance, data ownership and local storage health.</PageDescription>
        </div>
      </PageHeader>

      <PageBody className="mx-auto w-full max-w-4xl">
        {/* Appearance */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Colour theme</p>
              <p className="text-xs text-muted-foreground">
                Light, dark, or follow your operating system. Saved to this browser only.
              </p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Data management</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Export workspace backup</p>
                <p className="text-xs text-muted-foreground">
                  Download every task and project as a JSON file you own.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export JSON
              </Button>
            </div>

            <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Import a backup</p>
                <p className="text-xs text-muted-foreground">
                  Restore a previous export. This replaces the current workspace after validation.
                </p>
              </div>
              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    void handleFileSelected(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Choose file…
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Reset workspace</p>
                <p className="text-xs text-muted-foreground">
                  Replace everything with the sample workspace. Export first if you want a copy.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)} className="shrink-0 text-destructive">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storage health */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <HardDrive className="h-4 w-4 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Local storage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!storage.available && (
              <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  This browser is blocking local storage, so nothing is being saved. Changes will be lost on
                  reload — use “Export JSON” to keep a copy.
                </p>
              </div>
            )}

            {storage.error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{storage.error}</p>
              </div>
            )}

            <dl className="grid gap-4 sm:grid-cols-2">
              <Stat label="Tasks stored" value={stats.totalTasks} />
              <Stat label="Projects stored" value={stats.totalProjects} />
              <Stat label="Open tasks" value={stats.openTasks} />
              <Stat label="Approximate size" value={`${(workspaceBytes / 1024).toFixed(1)} kB`} />
            </dl>

            <p className="text-xs text-muted-foreground">
              {storage.lastSavedAt
                ? `Last saved ${formatTimestamp(storage.lastSavedAt)} · ${backupFilename()}`
                : 'Nothing has been written to this browser yet.'}
            </p>

            {storage.warnings.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {storage.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Motif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              Version 1.0.0 · local-first by design. Tasks and projects are stored in this browser only; no
              account, no server round-trip, no tracking.
            </p>
            <p>
              Built with React 19, Vite, TypeScript, Tailwind CSS, zod and the Blink UI component library.
            </p>
          </CardContent>
        </Card>
      </PageBody>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset this workspace?"
        description={`All ${stats.totalTasks} tasks and ${stats.totalProjects} projects will be replaced with the sample workspace. This cannot be undone.`}
        confirmLabel="Reset workspace"
        onConfirm={handleReset}
      />

      <ConfirmDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
        title="Replace the current workspace?"
        description={
          pendingImport
            ? `The backup exported ${formatTimestamp(pendingImport.exportedAt)} contains ${pendingImport.snapshot.tasks.length} tasks and ${pendingImport.snapshot.projects.length} projects. They will replace your current data.`
            : ''
        }
        confirmLabel="Import backup"
        destructive={false}
        onConfirm={confirmImport}
      />
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular-nums mt-1 text-xl font-bold text-foreground">{value}</dd>
    </div>
  )
}

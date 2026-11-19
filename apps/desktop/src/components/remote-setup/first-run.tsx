import { useState } from 'react'
import type { ReactElement } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DesktopConnectionConfigInput } from '@/global'
import { useI18n } from '@/i18n'
import { Loader2 } from '@/lib/icons'

import { RemoteSetupFields } from './fields'
import { useRemoteSetup } from './use-remote-setup'

interface FirstRunRemoteSetupProps {
  onBack: () => void
}

export function FirstRunRemoteSetup({ onBack }: FirstRunRemoteSetupProps): ReactElement {
  const { t } = useI18n()
  const copy = t.install
  const sshCopy = t.settings.gateway
  const [sshMode, setSshMode] = useState(false)
  const [sshHost, setSshHost] = useState('')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [sshHermesPath, setSshHermesPath] = useState('')
  const [testingSsh, setTestingSsh] = useState(false)
  const [sshTestResult, setSshTestResult] = useState<{ platform: string } | null>(null)
  const setup = useRemoteSetup({ host: 'first-run' })
  const [applying, setApplying] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // SSH 复用设置页的连接类型和主进程接口，首次设置无需启动本机安装流程。
  const sshConfig: DesktopConnectionConfigInput = {
    mode: 'ssh',
    sshHost: sshHost.trim(),
    sshKeyPath: sshKeyPath.trim(),
    sshRemoteHermesPath: sshHermesPath.trim()
  }
  const busy = applying || testingSsh || setup.testing
  const canTest = sshMode ? Boolean(sshConfig.sshHost) : setup.canTest

  const resetSshTest = (): void => {
    setSshTestResult(null)
    setError(null)
  }

  const test = async (): Promise<void> => {
    if (!sshMode) {
      await setup.test()
      return
    }
    if (!canTest || busy) {
      return
    }

    setTestingSsh(true)
    resetSshTest()
    try {
      const result = await window.hermesDesktop.testConnectionConfig(sshConfig)
      if (!result.reachable) {
        throw new Error(result.error || sshCopy.sshErrUnknown)
      }
      setSshTestResult({ platform: result.remotePlatform || 'SSH' })
    } catch (err) {
      setError(err instanceof Error ? err.message : sshCopy.sshErrUnknown)
    } finally {
      setTestingSsh(false)
    }
  }

  const canApply = sshMode ? canTest : setup.canCommit
  const apply = async (): Promise<void> => {
    if (!canApply || busy) {
      return
    }

    setApplying(true)
    setError(null)

    try {
      await window.hermesDesktop.applyConnectionConfig(sshMode ? sshConfig : setup.payload)
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err || t.settings.gateway.applyFailed))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-(--z-setup) flex items-center justify-center bg-background/90 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-xl flex-col rounded-xl border border-(--stroke-nous) bg-card p-8 shadow-nous">
        <div className="flex items-start gap-4">
          <BrandMark className="size-11 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{sshMode ? sshCopy.sshTitle : copy.remoteSetupTitle}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{sshMode ? sshCopy.sshDesc : copy.remoteSetupDesc}</p>
          </div>
        </div>
        <div className="mt-6">
          {sshMode ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-xs text-muted-foreground">
                <span>{sshCopy.sshHostTitle}</span>
                <Input
                  disabled={busy}
                  onChange={event => {
                    setSshHost(event.target.value)
                    resetSshTest()
                  }}
                  placeholder="user@host:22"
                  value={sshHost}
                />
                <span>{sshCopy.sshHostDesc}</span>
              </label>
              <label className="grid gap-1.5 text-xs text-muted-foreground">
                <span>{sshCopy.sshKeyTitle}</span>
                <Input
                  disabled={busy}
                  onChange={event => {
                    setSshKeyPath(event.target.value)
                    resetSshTest()
                  }}
                  value={sshKeyPath}
                />
                <span>{sshCopy.sshKeyDesc}</span>
              </label>
              <label className="grid gap-1.5 text-xs text-muted-foreground">
                <span>{sshCopy.sshHermesPathTitle}</span>
                <Input
                  disabled={busy}
                  onChange={event => {
                    setSshHermesPath(event.target.value)
                    resetSshTest()
                  }}
                  placeholder={sshCopy.sshHermesPathPlaceholder}
                  value={sshHermesPath}
                />
              </label>
              {sshTestResult ? (
                <p className="text-sm text-primary" role="status">
                  {sshCopy.sshReachable(sshHost.trim(), sshTestResult.platform)}
                </p>
              ) : null}
            </div>
          ) : (
            <RemoteSetupFields disabled={applying} setup={setup} />
          )}
          {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy} onClick={onBack} size="sm" variant="ghost">
              {copy.backToSetup}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setSshMode(!sshMode)
                resetSshTest()
              }}
              size="sm"
              variant="outline"
            >
              {sshMode ? copy.remoteUrlTitle : sshCopy.sshTitle}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={busy || !canTest}
              onClick={() => void test()}
              size="sm"
              variant="secondary"
            >
              {testingSsh || setup.testing ? <Loader2 className="animate-spin" /> : null}
              {sshMode ? sshCopy.sshTestConnection : copy.testConnection}
            </Button>
            <Button disabled={busy || !canApply} onClick={() => void apply()} size="sm">
              {applying ? <Loader2 className="animate-spin" /> : null}
              {sshMode ? sshCopy.sshConnect : copy.applyRemote}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

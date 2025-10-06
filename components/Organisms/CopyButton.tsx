import type { ComponentProps, PropsWithChildren } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/text'
import { Button } from '../ui/button'
import { InputGroupButton } from '../ui/input-group'

interface CopyButtonProps extends PropsWithChildren {
  text: string
  variant?: 'default' | 'input-button'
}
export default function CopyButton({ children, text, variant = 'default' }: CopyButtonProps) {
  interface HandleCopyClickProps extends Pick<Parameters<typeof copyToClipboard>[0], 'text'> { }
  function handleCopyClick({ text }: HandleCopyClickProps) {
    copyToClipboard({
      text,
      onSuccess: () => toast.info('Copied successfully'),
      onFail: () => toast.error('Error during copy'),
    })
  }

  const Wrapper = variant === 'default' ? Button : InputGroupButton
  const sizeMap: Record<NonNullable<CopyButtonProps['variant']>, ComponentProps<typeof Button>['size'] | ComponentProps<typeof InputGroupButton>['size']> = {
    'default': 'icon',
    'input-button': 'icon-xs',
  }

  return (
    <Wrapper variant="ghost" className="relative z-1" size={sizeMap[variant] as any} onClick={() => handleCopyClick({ text })}>
      {children?.toString
        ? (
            <div>
              {children}
            </div>
          )
        : (
            <Copy size={12} />
          )}
    </Wrapper>
  )
}

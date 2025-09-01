'use client'
import { Laptop2, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeTabs() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted)
    return null

  const value: Theme = (theme as Theme) ?? 'system'

  return (
    <Tabs value={value} onValueChange={v => setTheme(v as Theme)}>
      <TabsList>
        <TabsTrigger value="light" aria-label="Use light theme">
          <Sun />
        </TabsTrigger>
        <TabsTrigger value="dark" aria-label="Use dark theme">
          <Moon />
        </TabsTrigger>
        <TabsTrigger value="system" aria-label="Follow system theme">
          <Laptop2 />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

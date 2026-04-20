import type { FC, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface SettingsSection {
  key: string
  label: string
}

interface SettingsViewProps extends PropsWithChildren {
  navigation: SettingsSection[]
}

const SettingsView: FC<SettingsViewProps> = ({ children, navigation }) => {
  return (
    <Tabs orientation='vertical' defaultValue={navigation[0]?.key} className="gap-0">
      <div className='grid grid-cols-1 gap-4 md:grid-cols-12'>
        <div className="border-b border-neutral-800 pb-4 md:col-span-3 md:border-b-0 md:border-r md:pb-0 md:pr-4">
          <TabsList className="h-auto w-full flex-col items-stretch justify-start gap-1 rounded-none bg-transparent p-0">
            {navigation.map((section) => (
              <TabsTrigger
                value={section.key}
                key={section.key}
                className={cn(
                  "w-full justify-start rounded-sm px-2 py-1 text-left text-neutral-300 shadow-none",
                  "hover:bg-neutral-800 hover:text-neutral-50",
                  "data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-50 data-[state=active]:outline data-[state=active]:outline-1 data-[state=active]:outline-neutral-700"
                )}
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="md:col-span-9">
          {children}
        </div>
      </div>
    </Tabs>
  );
};

const SettingsContent: FC<React.ComponentProps<typeof TabsContent>> = ({ children, className, ...props }) => {

  return (
    <TabsContent forceMount {...props} className={cn("min-h-[60lvh] data-[state=inactive]:hidden", className)}>
      {children}
    </TabsContent>
  )
}


export { SettingsView, SettingsContent };

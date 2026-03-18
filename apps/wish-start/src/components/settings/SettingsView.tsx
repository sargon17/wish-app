import type { FC, PropsWithChildren } from 'react';

import { Root, TabsContent, TabsList, Trigger } from "@radix-ui/react-tabs";
import { cn } from '@/lib/utils';
import { DialogContent } from '@radix-ui/react-dialog';
import { Dialog, DialogTrigger } from '../ui/dialog';

interface SettingsSection {
  key: string
  label: string
}

interface SettingsViewProps extends PropsWithChildren {
  navigation: SettingsSection[]
}

const SettingsView: FC<SettingsViewProps> = ({ children, navigation }) => {
  return (
    <Dialog>

      <DialogContent className="w-[96vw] sm:w-[92vw] lg:w-295 xl:w-330 sm:max-w-none max-h-[88vh] overflow-y-auto">
        <Root orientation='vertical' defaultValue={navigation[0]?.key}>
          <div className='grid grid-cols-12 gap-4'>
            <div className="col-span-2 border-r border-neutral-800">
              <TabsList>
                <div className="flex flex-col items-start gap-1">
                  {
                    navigation.map((section) => (
                      <Trigger value={section.key} key={section.key}
                        className={cn(
                          "text-neutral-300 w-full text-left p-2 py-0.5 rounded-sm cursor-pointer",
                          "hover:bg-neutral-800",
                          "data-[state=active]:text-neutral-50 data-[state=active]:bg-neutral-800 data-[state=active]:outline-1 outline-neutral-700"
                        )}
                      >{section.label}</Trigger>
                    ))
                  }
                </div>
              </TabsList>
            </div>
            <div className="col-span-10">
              {children}
            </div>
          </div>
        </Root>
      </DialogContent>
    </Dialog>
  );
};

const SettingsContent: FC<React.ComponentProps<typeof TabsContent>> = ({ children, ...props }) => {

  return (
    <TabsContent {...props} className="min-h-[60lvh]">
      {children}
    </TabsContent>
  )
}


const SettingsTrigger: FC<React.ComponentProps<typeof DialogTrigger>> = ({ children, ...props }) => {
  return (
    <DialogTrigger {...props} >{children}</DialogTrigger>
  )
}

export { SettingsView, SettingsContent, SettingsTrigger };

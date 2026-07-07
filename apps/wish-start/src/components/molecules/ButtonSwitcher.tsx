import { Button } from "@components/ui/button";
import { ButtonGroup } from "@components/ui/button-group";
import type { LucideIcon } from "lucide-react";

interface Switch<T> {
  type: T
  label: string,
  icon: LucideIcon
}

interface ButtonSwitcherProps<T extends string | number> {
  switches: readonly Switch<T>[]
  selected: T
  onChange: (switchType: T) => void
}

function ButtonSwitcher<T extends string | number>({ switches, selected, onChange }: ButtonSwitcherProps<T>) {


  const handleClick = (switchType: T) => {
    if (selected === switchType) return
    onChange(switchType)
  }


  return (
    <ButtonGroup>
      {
        switches.map((switchItem) => {
          const Icon = switchItem.icon
          return (
            <Button
              className="shrink-0"
              variant={selected === switchItem.type ? "default" : "outline"}
              key={switchItem.type}
              onClick={() => handleClick(switchItem.type)
              }>
              <Icon />
              {switchItem.label}
            </Button>
          )
        })
      }
    </ButtonGroup>
  );
};

export default ButtonSwitcher;

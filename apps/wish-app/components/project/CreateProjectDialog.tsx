"use client";
import { type } from "arktype";
import { useMutation } from "convex/react";
import { AlertTriangle, KeyRound } from "lucide-react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import CopyButton from "@/components/Organisms/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { arktypeResolver } from "@hookform/resolvers/arktype";

interface Props {
  children: React.ReactNode;
}

const Schema = type({
  title: "string > 2",
});

type FormType = typeof Schema.infer;

export default function CreateProjectDialog({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState("");
  const createProject = useMutation(api.projects.createProject);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormType>({ resolver: arktypeResolver(Schema), mode: "onBlur" });

  const onSubmit: SubmitHandler<FormType> = async (data) => {
    const { title } = data;
    try {
      const result = await createProject({ title });

      if (result.apiKey) {
        setCreatedApiKey(result.apiKey);
        toast.success("Project created. API key ready.");
        return;
      }

      toast.success("Project created");
      reset();
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to create the project");
      throw new Error("Unable to create the project");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) {
      setCreatedApiKey("");
      reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {createdApiKey ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Project API key</DialogTitle>
              <DialogDescription>
                This key is shown once right after project creation.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Save this key now</AlertTitle>
              <AlertDescription>
                The raw key is not stored. If you lose it, regenerate it from project settings.
              </AlertDescription>
            </Alert>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>API key</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput value={createdApiKey} readOnly />
              <InputGroupAddon align="inline-end">
                <CopyButton text={createdApiKey} variant="input-button" />
              </InputGroupAddon>
            </InputGroup>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setCreatedApiKey("");
                  reset();
                  setIsOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Give a name to your new project</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="title">Title</Label>
                <Input {...register("title")} aria-invalid={errors.title && true} />
                {errors.title && (
                  <p className="text-red-500 text-xs flex gap-2">
                    <AlertTriangle size={16} />
                    {errors.title?.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

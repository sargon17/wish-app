"use client";
import { type } from "arktype";
import { useMutation } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const createProject = useMutation(api.projects.createProject);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormType>({ resolver: arktypeResolver(Schema), mode: "onBlur" });

  const onSubmit: SubmitHandler<FormType> = async (data) => {
    const { title } = data;
    try {
      await createProject({ title });
      setIsOpen(false);
    } catch {
      throw new Error("Unable to create the project");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

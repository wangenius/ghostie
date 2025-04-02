import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input, InputProps } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, ReactNode } from "react";
import {
  Controller,
  FieldValues,
  useForm,
  useFormContext,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

type FormWrapperProps<T extends FieldValues> = {
  schema?: z.ZodSchema<T>;
  defaultValues?: UseFormProps<T>["defaultValues"];
  onSubmit: (data: T) => void;
  children: ReactNode;
  preventEnterSubmit?: boolean;
  className?: string;
  form?: UseFormReturn<T, any, undefined>;
};

/* 表单组件 */
export function FormContainer<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  preventEnterSubmit = false,
  className,
  form: formProps,
}: FormWrapperProps<T>) {
  const form = formProps
    ? formProps
    : useForm<T>({
        resolver: schema ? zodResolver(schema) : undefined,
        defaultValues,
      });

  return (
    <Form {...form}>
      <form
        className={cn("flex-1", className)}
        onSubmit={form.handleSubmit((data) => {
          onSubmit(data as T);
        })}
        onKeyDown={(e) => {
          if (preventEnterSubmit && e.key === "Enter") {
            e.preventDefault();
          }
        }}
      >
        {children}
      </form>
    </Form>
  );
}

type FormInputProps = {
  name: string;
  label?: string;
  placeholder?: string;
  type?: string;
  description?: string;
  rules?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  accept?: string;
  autoFocus?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
  textAreaClassName?: string;
};

export const FormInput = forwardRef<
  HTMLInputElement,
  FormInputProps & InputProps
>(
  (
    {
      name,
      label,
      placeholder,
      type = "text",
      className,
      inputClassName,
      onChange,
      autoFocus,
      description,
      accept,
      required,
      ...inputProps
    },
    ref,
  ) => {
    const { control } = useFormContext();

    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className={cn(className)}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                autoFocus={autoFocus}
                className={inputClassName}
                {...field}
                {...inputProps}
                ref={ref}
                onValueChange={(e) => {
                  field.onChange(e);
                  onChange?.(e);
                }}
                accept={accept}
                id={name}
                placeholder={placeholder}
                type={type}
                value={field.value || ""}
                required={required}
                autoComplete="new-password"
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  },
);

FormInput.displayName = "FormInput";

export function FormTextArea({
  name,
  label,
  placeholder,
  className,
  textAreaClassName,
  onChange,
  autoFocus,
  disabled,
  description,
  required,
}: FormInputProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              disabled={disabled}
              autoFocus={autoFocus}
              {...field}
              onChange={(e) => {
                field.onChange(e);
                onChange && onChange(e.target.value);
              }}
              className={textAreaClassName}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  if (e.shiftKey) {
                    // Shift + Enter 时允许换行
                    return;
                  }
                  // 普通回车时提交表单
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              id={name}
              placeholder={placeholder}
              required={required}
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type Option = { value: string; label: string | ReactNode };

type FormRadioProps = {
  name: string;
  label: string;
  options: Option[];
  className?: string;
};

export function FormRadio({ name, label, options, className }: FormRadioProps) {
  const { control } = useFormContext();

  return (
    <div className={"space-y-2"}>
      <label className="text-xs font-medium">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div
            className={cn(
              "flex flex-wrap gap-4 bg-muted/50 p-2 rounded-lg",
              className,
            )}
          >
            {options.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "relative cursor-pointer p-2",
                  field.value === option.value &&
                    "bg-muted-foreground/20 rounded-lg",
                )}
              >
                <input
                  {...field}
                  type="radio"
                  value={option.value}
                  checked={field.value === option.value}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      />
      <FormMessage />
    </div>
  );
}

type FormCheckboxProps = {
  name: string;
  label?: string;
  className?: string;
};

export function FormCheckbox({ name, label, className }: FormCheckboxProps) {
  const { control } = useFormContext();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <label className="text-sm" htmlFor={name}>
          {label}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              id={name}
            />
          )}
        />
      </div>
      <FormMessage />
    </div>
  );
}

type FormSelectProps = {
  name: string;
  label?: string;
  options: Option[];
  description?: string;
  className?: string;
  emptyText?: string;
  align?: "center" | "end" | "start" | undefined;
};

export function FormSelect({
  name,
  label,
  options,
  description,
  className,
  emptyText = "暂无数据",
  align = "start",
}: FormSelectProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
            </FormControl>
            <SelectContent align={align}>
              {options.length > 0 ? (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {emptyText}
                </div>
              )}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

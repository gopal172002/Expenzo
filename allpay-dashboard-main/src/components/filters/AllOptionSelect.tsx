import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type FormControlProps,
  type SelectChangeEvent,
  type SelectProps,
} from "@mui/material";

type AllOptionSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  fullWidth?: boolean;
  minWidth?: number | string;
  size?: FormControlProps["size"];
  sx?: FormControlProps["sx"];
  SelectProps?: Omit<
    SelectProps<string>,
    "value" | "onChange" | "label" | "displayEmpty" | "renderValue" | "children"
  >;
};

/** MUI Select blanks out on "" until blur; this always shows the All label. */
export function AllOptionSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  disabled,
  fullWidth = false,
  minWidth = 150,
  size = "small",
  sx,
  SelectProps,
}: AllOptionSelectProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      sx={{ minWidth: fullWidth ? 0 : minWidth, ...((sx as object) || {}) }}
    >
      <InputLabel shrink>{label}</InputLabel>
      <Select
        label={label}
        displayEmpty
        notched
        value={value ?? ""}
        onChange={handleChange}
        renderValue={(selected) => {
          if (!selected) return allLabel;
          const match = options.find((opt) => opt.value === selected);
          return match?.label ?? String(selected);
        }}
        {...SelectProps}
      >
        <MenuItem value="">{allLabel}</MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

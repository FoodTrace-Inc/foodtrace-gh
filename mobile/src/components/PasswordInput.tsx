import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Icon } from "./Icon";

interface Props extends Omit<TextInputProps, "secureTextEntry" | "style"> {
  inputStyle?: TextInputProps["style"];
  iconColor?: string;
}

export function PasswordInput({ inputStyle, iconColor = "#716b63", ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput {...rest} style={[inputStyle, styles.input]} secureTextEntry={!visible} />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={styles.toggle}
      >
        <Icon name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", justifyContent: "center" },
  input: { paddingRight: 44 },
  toggle: { position: "absolute", right: 12, padding: 4 },
});

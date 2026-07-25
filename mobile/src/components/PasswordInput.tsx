import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

interface Props extends Omit<TextInputProps, "secureTextEntry" | "style"> {
  inputStyle?: TextInputProps["style"];
}

export function PasswordInput({ inputStyle, ...rest }: Props) {
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
        <Text style={styles.icon}>{visible ? "🙈" : "👁"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", justifyContent: "center" },
  input: { paddingRight: 44 },
  toggle: { position: "absolute", right: 12, padding: 4 },
  icon: { fontSize: 16 },
});

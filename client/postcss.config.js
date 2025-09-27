const disabled = process.env.VITEST
export default {
  plugins: disabled ? {} : {
    tailwindcss: {},
    autoprefixer: {},
  },
}
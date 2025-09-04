import antfu from '@antfu/eslint-config'
import next from 'eslint-config-next'

export default antfu({
  ...next()
})

'use client'
import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../convex/_generated/api'

export default function Home() {
  // const [message, setMessage] = useState()
  const tasks = useQuery(api.tasks.get)

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const res = await fetch('/api/hello')
  //     const { message } = await res.json()
  //     setMessage(message)
  //   }
  //   fetchData()
  // }, [])

  // if (!message)
  //   return <p>Loading...</p>

  return (
    <div>
      {tasks?.map(({ _id, text }) => <div key={_id}>{text}</div>)}
    </div>
  )
}

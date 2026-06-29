import { toast } from 'sonner'

export function useToast() {
  return {
    addToast: ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
      if (variant === 'destructive') {
        toast.error(title, { description })
      } else if (variant === 'warning') {
        toast.warning(title, { description })
      } else {
        toast.success(title, { description })
      }
    }
  }
}

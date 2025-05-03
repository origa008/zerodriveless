
// Fix the problematic line with the truthy check for startRide() function
const result = await startRide(ride.id);
if (!result) {
  toast({
    title: "Error",
    description: "Failed to start the ride",
    variant: "destructive",
    duration: 3000
  });
  return;
}
